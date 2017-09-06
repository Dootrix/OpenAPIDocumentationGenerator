# Swagger Documentation

## Notes

This project uses node to generate html/pdf documentation.  Package.json can be used to reinstall dependencies if necessary via `npm install`.

The output is generated via handlebars templates and the `html-to-pdf` package that uses `phantomjs` to print the pages.

## Formatting the document
`html-to-pdf` allows for a per page header and footer based on `id="pageHeader"` and `id="pageFooter"` in the document.  Note that these are hoisted out of the html and therefore do not take any css classes with them (only inline styles).

`main.css` contains additional styling (on top of the boostrap defaults) particularly with regard to use of page-break-inside/page-break-before/page-break-after to organise the pdf pages.