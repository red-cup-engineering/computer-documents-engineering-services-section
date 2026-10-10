--- Removes org-drill review state from a document.
--
-- Org-drill annotates a heading with a card type and a scheduling record —
-- ease, interval, repeat and failure counts, last quality, last reviewed — and
-- tags it `:drill:`. Every one of those keys is evidence about a reader's
-- practice at some past moment. None is evidence about the document's subject.
-- Carrying them into a converted document would present a reader's 2023 review
-- history as though it were part of what the document says.
--
-- A drill card is not merely annotated by that state; it *is* that state. Its
-- body is a cloze-deleted restatement of prose that already appears elsewhere
-- in the document, generated to be recited rather than read. So the card's
-- section is removed whole, not stripped of its properties and kept.
--
-- Removing a card can leave its parent heading holding nothing. A heading that
-- is emptied by this filter is removed too; a heading that was already empty in
-- the source is kept, because its emptiness is the author's and not ours.

local function is_drill_tag(inline)
  return inline.t == "Span"
    and inline.classes:includes("tag")
    and pandoc.utils.stringify(inline) == "drill"
end

--- Reports whether a heading carries org-drill state.
local function is_drill_header(header)
  for _, attribute in ipairs(header.attributes) do
    if attribute[1]:match("^drill_") then
      return true
    end
  end
  for _, inline in ipairs(header.content) do
    if is_drill_tag(inline) then
      return true
    end
  end
  return false
end

--- Groups a flat block list into the heading tree it denotes.
--
-- Pandoc's Org reader emits headings as siblings in one list, with a section's
-- extent implied by the levels that follow it. Pruning a section requires that
-- extent to be explicit, so it is reconstructed here and flattened again after.
local function parse_sections(blocks, index, level)
  local sections = {}
  while index <= #blocks do
    local block = blocks[index]
    if block.t ~= "Header" or block.level <= level then
      break
    end
    local section = { header = block, content = {}, children = {} }
    index = index + 1
    while index <= #blocks and blocks[index].t ~= "Header" do
      section.content[#section.content + 1] = blocks[index]
      index = index + 1
    end
    section.children, index = parse_sections(blocks, index, block.level)
    sections[#sections + 1] = section
  end
  return sections, index
end

local function prune_sections(sections)
  local retained = {}
  for _, section in ipairs(sections) do
    if not is_drill_header(section.header) then
      local was_occupied = #section.content > 0 or #section.children > 0
      section.children = prune_sections(section.children)
      local is_occupied = #section.content > 0 or #section.children > 0
      if is_occupied or not was_occupied then
        retained[#retained + 1] = section
      end
    end
  end
  return retained
end

local function flatten_sections(sections, blocks)
  for _, section in ipairs(sections) do
    blocks[#blocks + 1] = section.header
    for _, block in ipairs(section.content) do
      blocks[#blocks + 1] = block
    end
    flatten_sections(section.children, blocks)
  end
  return blocks
end

--- Strips drill state from a heading that is itself retained.
--
-- A heading can carry a `:drill:` tag or a stray scheduling key without being a
-- card — an author's tag on ordinary prose, say. Such a heading keeps its
-- content and loses only the annotation.
local function strip_drill_state(header)
  local attributes = {}
  for _, attribute in ipairs(header.attributes) do
    if not attribute[1]:match("^drill_") then
      attributes[#attributes + 1] = attribute
    end
  end
  header.attributes = attributes

  local content = pandoc.Inlines({})
  for _, inline in ipairs(header.content) do
    if not is_drill_tag(inline) then
      content:insert(inline)
    end
  end
  -- The tag is preceded by the spacing that separated it from the heading text.
  while #content > 0 and content[#content].t == "Space" do
    content:remove(#content)
  end
  header.content = content

  return header
end

function Pandoc(document)
  local blocks = document.blocks
  local preamble = {}
  local index = 1
  while index <= #blocks and blocks[index].t ~= "Header" do
    preamble[#preamble + 1] = blocks[index]
    index = index + 1
  end

  local sections = parse_sections(blocks, index, 0)
  local retained = flatten_sections(prune_sections(sections), preamble)
  for position, block in ipairs(retained) do
    if block.t == "Header" then
      retained[position] = strip_drill_state(block)
    end
  end

  document.blocks = pandoc.Blocks(retained)
  return document
end
