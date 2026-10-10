--- Drops Org markup the reader could not interpret.
--
-- Affiliated keywords such as `#+name:` label a block for Org's own tooling.
-- The reader has no target construct for them, so it preserves them as raw Org
-- rather than lose them. Raw Org in a Markdown document is not Markdown; it is
-- the reader reporting that it declined to interpret something.
--
-- Some writers pass raw blocks through as a literal `{=org}` fence and others
-- discard them silently. Neither is a decision the writer should be making, so
-- the residue is removed here where the choice is visible.

local function drop_org(element)
  if element.format == "org" then
    return {}
  end
  return nil
end

return {
  { RawBlock = drop_org, RawInline = drop_org },
}
