const { readFileSync } = require('node:fs');
const { dirname, resolve } = require('node:path');

// snabb-mobilpublicering: Playwright loads fixtures without Vite's ?raw handler.
module.exports = ({ types }) => ({
  visitor: {
    ImportDeclaration(path, state) {
      const source = path.node.source.value;
      if (!source.endsWith('.txt?raw')) return;
      const file = resolve(dirname(state.filename), source.slice(0, -4));
      const content = readFileSync(file, 'utf8');
      path.replaceWith(
        types.variableDeclaration('const', [
          types.variableDeclarator(
            path.node.specifiers[0].local,
            types.stringLiteral(content),
          ),
        ]),
      );
    },
  },
});
