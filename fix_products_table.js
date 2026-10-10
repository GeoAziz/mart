const fs = require('fs');
const file = 'src/app/admin/products/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Remove react-window import
content = content.replace("import { FixedSizeList as List, ListChildComponentProps } from 'react-window';\n", "");

// Replace Row component with standard render function or just inline it
const rowRegex = /\/\/ Virtualized row renderer\s*const Row = \(\{ index, style \}: ListChildComponentProps\) => \{\s*const product = products\[index\];\s*return \(\s*<div style=\{style\}>\s*(<TableRow key=\{product\.id\}.*?<\/TableRow>)\s*<\/div>\s*\);\s*\};\s*/s;

const rowMatch = content.match(rowRegex);
if (!rowMatch) {
  console.log("Could not find Row component to replace");
  process.exit(1);
}
const tableRowContent = rowMatch[1];
content = content.replace(rowMatch[0], "");

// Replace Table and List with mapped TableBody
const listRegex = /<Table>\s*<TableHeader>.*?<\/TableHeader>\s*<\/Table>\s*<List\s*ref=\{listRef\}\s*height=\{520\}\s*itemCount=\{products\.length\}\s*itemSize=\{72\}\s*width=\{"100%"\}\s*>\s*\{Row\}\s*<\/List>/s;

const listMatch = content.match(listRegex);
if (!listMatch) {
  console.log("Could not find List component to replace");
  process.exit(1);
}

const replacement = `<div className="overflow-x-auto rounded-md border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px] hidden sm:table-cell"></TableHead>
                      <TableHead>Product Name</TableHead>
                      <TableHead>Seller/Vendor ID</TableHead>
                      <TableHead>Date Submitted</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => (
                      ${tableRowContent.replace(/\n/g, '\n                      ')}
                    ))}
                  </TableBody>
                </Table>
              </div>`;

content = content.replace(listMatch[0], replacement);

// Also remove `const listRef = useRef<any>(null);`
content = content.replace("const listRef = useRef<any>(null);\n", "");

fs.writeFileSync(file, content);
console.log("Fixed products table");
