# Gallery images

Drop image files straight into these folders - they appear on /gallery/
automatically at build time. No config, no manifest.

    paintings/   -> the "Paintings" tab
    photos/      -> the "Photos" tab

Ordering is alphabetical by filename, so prefix them to control the
sequence:

    01-harbour.jpg
    02-sunhat.jpg
    03-dragon.png

## Supported formats

    .jpg  .jpeg  .png  .gif  .webp  .avif  .svg

Upper-case extensions (.JPG, .PNG) work too. Anything else in the folder
is ignored, so a stray README or .txt won't break the page.

NOT supported: .heic / .heif. iPhones shoot HEIC by default and only
Safari can display it, so those are skipped rather than shown broken.
Convert them first - on a Mac, open in Preview and
File > Export... > JPEG, or select several in Finder and use the
Quick Actions > Convert Image option.

Aspect ratio doesn't matter. The layout packs images into justified rows
and scales each one to fill the row width, the same way Flickr or Google
Photos do, so portrait and landscape mix freely.

To add a whole new tab, add an entry to the `tabs:` list in gallery.html
and create a folder here with a matching `dir:` name.
