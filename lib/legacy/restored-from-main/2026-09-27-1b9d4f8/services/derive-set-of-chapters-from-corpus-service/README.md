# @red-cup-engineering/derive-set-of-chapters-from-corpus-service

Derives one ordered chapters directory from named corpus section roots, plus the partial ebook-production manifest produceEbook consumes.

## Operation

~~~js
export async function deriveSetOfChaptersFromCorpus(input)
~~~

### Parameters

- input ({
 *   roots?: string[],
 *   parts: Array<{title: string, roots: string[]}>,
 *   carriers?: string[],
 *   ordering?: string,
 *   style?: object,
 *   title: string,
 *   subtitle?: string,
 *   author: string,
 *   chaptersDir: string,
 *   frontMatterNotePaths?: string[],
 *   appendixNotePaths?: string[],
 * }): 

### Returns

Promise<{type: string, version: number, chaptersDir: string, chapterFiles: string[], manifest: object}>: 

### Refusals

- TypeError: when input fails INPUT_SCHEMA
- Error: when the produced output fails OUTPUT_SCHEMA

## Command

derive-set-of-chapters-from-corpus reads one JSON value per input line and writes one JSON value per output line.

## Examples

### derives a two-part-title-and-section book from one fixture section

Input:

~~~json
{
  "parts": [
    {
      "title": "Example Part",
      "roots": [
        "/tmp/claude-1000/-home-emsenn-info/0fbcd5bf-4b2d-45fb-867e-4d0865931cd2/scratchpad/example-fixture-section-services-section"
      ]
    }
  ],
  "title": "Example Book",
  "author": "Example Author",
  "chaptersDir": "/tmp/claude-1000/-home-emsenn-info/0fbcd5bf-4b2d-45fb-867e-4d0865931cd2/scratchpad/example-chapters"
}
~~~

Output:

~~~json
{
  "type": "DerivedChapterSet",
  "version": 1,
  "chaptersDir": "/tmp/claude-1000/-home-emsenn-info/0fbcd5bf-4b2d-45fb-867e-4d0865931cd2/scratchpad/example-chapters",
  "chapterFiles": [
    "000-example-part-part-title.md",
    "001-example-fixture-section.md"
  ],
  "manifest": {
    "slug": "example-book",
    "title": "Example Book",
    "author": "Example Author",
    "bookDir": "/tmp/claude-1000/-home-emsenn-info/0fbcd5bf-4b2d-45fb-867e-4d0865931cd2/scratchpad/example-chapters"
  }
}
~~~
