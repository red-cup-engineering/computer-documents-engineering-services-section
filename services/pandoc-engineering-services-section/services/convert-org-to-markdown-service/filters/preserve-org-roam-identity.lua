--- Carries org-roam node identity across a codec change.
--
-- Pandoc's Org reader surfaces a file's `:ID:` and `:ROAM_ALIASES:` as document
-- metadata, and a heading's `:ID:` and `:ROAM_REFS:` as header attributes. In
-- every case the property name survives but its *role* does not: a heading's
-- `:ID:` arrives as an ordinary attribute named `id` sitting beside the
-- attribute list, while the heading's anchor holds a slug derived from its
-- text. Writing that out unchanged would emit the UUID as decoration and the
-- slug as the address, which inverts which one other documents can link to.
--
-- This filter restores the roles. It moves identity into the position the
-- target codec addresses, and renames the remaining org-roam properties to the
-- hyphenated form the corpus uses in frontmatter. It asserts nothing about what
-- a UUID refers to; it only keeps the claim intact.

--- Splits an org-roam alias property into its quoted members.
--
-- `:ROAM_ALIASES:` holds a whitespace-separated list whose multi-word members
-- are double-quoted. An unquoted single alias is legal, so a value with no
-- quotes at all is taken whole rather than split on spaces.
local function parse_aliases(value)
  local aliases = {}
  for alias in value:gmatch('"([^"]*)"') do
    aliases[#aliases + 1] = pandoc.MetaString(alias)
  end
  if #aliases == 0 then
    local bare = value:match("^%s*(.-)%s*$")
    if bare ~= "" then
      aliases[1] = pandoc.MetaString(bare)
    end
  end
  return aliases
end

--- Promotes the file's org-roam properties to their frontmatter names.
--
-- The reader already names the file `:ID:` `id`, which is the name the corpus
-- uses, so it passes through untouched.
function Meta(meta)
  if meta.roam_aliases then
    local aliases = parse_aliases(pandoc.utils.stringify(meta.roam_aliases))
    if #aliases > 0 then
      meta.aliases = pandoc.MetaList(aliases)
    end
    meta.roam_aliases = nil
  end
  if meta.roam_refs then
    meta["roam-refs"] = meta.roam_refs
    meta.roam_refs = nil
  end
  return meta
end

--- Makes a heading's org-roam `:ID:` its anchor.
--
-- The text-derived slug the reader supplies is discarded rather than kept
-- alongside, because a heading has one address and inbound `[[id:…]]` links
-- name the UUID.
function Header(header)
  local retained = {}
  for _, attribute in ipairs(header.attributes) do
    local key, value = attribute[1], attribute[2]
    if key == "id" then
      header.identifier = value
    elseif key == "roam_refs" then
      retained[#retained + 1] = { "roam-refs", value }
    else
      retained[#retained + 1] = { key, value }
    end
  end
  header.attributes = retained
  return header
end
