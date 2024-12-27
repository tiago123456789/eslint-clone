export default class SyntaxTreeProcessor {
  constructor(filename) {
    this.filename = filename;
    this.errors = [];
    this.variables = {};
    this.variablesCounter = {};
    this.actionByType = {
      Literal: (node) => {
        this.applySingleQuote(node);
      },
      VariableDeclaration: (node) => {
        this.replaceVarToLet(node);
        this.loadVariables(node);
      },
      AssignmentExpression: (node) => {
        this.loadVariables(node);
      },
      ExpressionStatement: (node) => {},
    };
  }

  applySingleQuote(node) {
    if (
      typeof node.raw == "string" &&
      node.raw &&
      (node.raw[0] == '"' || node.raw[node.raw.length - 1] == "'")
    ) {
      node.raw = node.raw.replace(/"/g, "'");
      this.errors.push(
        `${this.filename}:${node.loc.start.line}:${node.loc.start.column} - no using single quote`
      );
    }
  }

  replaceVarToLet(node) {
    if (node.kind == "var") {
      node.kind = "let";
    }
  }

  setVariableConst() {
    for (let key in this.variables) {
      const hasOneReference = this.variablesCounter[key] == 1;
      if (hasOneReference) {
        this.variables[key].kind = "const";
        // this.errors.push(`${this.filename} - var`)
      }
    }
  }

  loadVariables(node) {
    if (node?.declarations && node?.declarations[0]?.id) {
      const name = node?.declarations[0]?.id.name;
      this.variables[name] = node;

      if (!this.variablesCounter[name]) {
        this.variablesCounter[name] = 1;
      } else {
        this.variablesCounter[name] += 1;
      }
    }

    if (node?.left?.type == "Identifier") {
      const name = node.left.name;
      if (!this.variablesCounter[name]) {
        this.variablesCounter[name] = 1;
      } else {
        this.variablesCounter[name] += 1;
      }
    }
  }

  hasConsoleLog(node) {
    return (
      node?.expression?.type == "CallExpression" &&
      node?.expression?.callee?.type == "MemberExpression" &&
      node?.expression?.callee?.object?.type == "Identifier" &&
      node?.expression?.callee?.object?.name == "console"
    );
  }

  traverse(node) {
    this.actionByType[node?.type]?.(node);
    for (let key in node) {
      if (typeof node[key] != "object") continue;
      this.traverse(node[key]);
    }
  }

  process(ast) {
    for (let index = 0; index < ast.body.length; index += 1) {
      if (
        ast.body[index].type == "ExpressionStatement" &&
        this.hasConsoleLog(ast.body[index])
      ) {
        this.errors.push(
          `${this.filename}:${ast.body[index].start + 1}:${
            ast.body[index].expression.callee.object.start + 1
          } - unnecessary console.log`
        );
        this.actionByType[ast.body[index].expression.arguments[0].type]?.(
          ast.body[index].expression.arguments[0]
        );
        ast.body.splice(index, 1);
      }
    }

    this.traverse(ast);
    this.setVariableConst();
  }

  getErrors() {
    return this.errors;
  }
}
