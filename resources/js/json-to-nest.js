/*
  JSON-to-NestJS
  by NitnekB

  A simple utility to translate JSON into a NestJS interface or DTO definition.
*/

function jsonToNest(json, objectType = 'interface') {
  let data;
  let parent = '';

  let accumulator = '';
  let content = '';
  let innerTabs = 0;
  let tabs = 0;

  const seen = {};
  const stack = [];

  try {
    data = JSON.parse(json.replace(/:(\s*\d*)\.0/g, ":$1.1"));
  } catch (e) {
    return {
      content: '',
      error: e.message
    };
  }

  if (typeof data === "object" && data !== null && Array.isArray(data)) {
    return {
      content: '',
      error: 'Does not handle Array, please use a valid JSON!'
    };
  }

  append(`export ${objectType} Parent`);

  parseScope(data);

  return {
    content: content += accumulator
  };

  function parseScope(scope, depth = 0) {
    if (typeof scope === "object" && scope !== null) {
      if (Array.isArray(scope)) {
        const scopeLength = scope.length;
        if (scopeLength > 0) {
          seen[parent] = Object.keys(scope);
          parseScope(scope[0], depth);
        }
      } else {
        const name = Object.keys(seen).includes(parent) ? `${formatObjectName(parent)}[]` : `${formatObjectName(parent)}`;

        if (depth >= 2) {
          appender(`${name};`)
        } else {
          append(name);
          if (parent !== '') {
            append(';');
          }
        }
        parseStruct(depth + 1, innerTabs, scope);
      }
    } else {
      if (depth >= 2) {
        appender(typeValue(scope));
      } else {
        append(typeValue(scope));
      }
    }
  }

  function formatObjectName(str) {
    const newStr = str.split('_').map((s) => {
      return capitalize(s)
    }).join('');
    const fullStr = objectType === 'interface' ? newStr : `${newStr}Dto`;
    return fullStr.replace(/_/g, '');
  }

  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function parseStruct(depth, innerTabs, scope) {
    stack.push(depth >= 2 ? '\n' : '')

    const keys = Object.keys(scope);

    if (depth >= 2) {
      const parentType = `export ${objectType} ${formatObjectName(parent)}`;

      // this can only handle two duplicate items
      if (parent in seen && compareObjectKeys(keys, seen[parent])) {
        stack.pop();
        return
      }

      appender(`${parentType} {`);
      appender('\n');
      ++innerTabs;

      for (let i in keys) {
        const keyname = keys[i];
        if (objectType !== 'interface') {
          const decorators = getTypeValueDecorators(scope[keyname], keyname);
          decorators.forEach(d => {
            indenter(innerTabs)
            appender(d + '\n');
          });
        }
        indenter(innerTabs)
        appender(`${keyname}: `);
        parent = keyname
        parseScope(scope[keyname], depth);
        appender(objectType !== 'interface' && i !== `${keys.length - 1}` ? '\n\n' : '\n');
      }
      indenter(--innerTabs);
      appender("}\n");
    } else {
      append(" {\n");
      ++tabs;
      for (let i in keys) {
        const keyname = keys[i];
        if (objectType !== 'interface') {
          const decorators = getTypeValueDecorators(scope[keyname], keyname);
          decorators.forEach(d => {
            indent(tabs)
            append(d + '\n');
          });
        }
        indent(tabs);
        append(`${keyname}: `);
        parent = keyname
        parseScope(scope[keys[i]], depth);
        append(objectType !== 'interface' && i !== `${keys.length - 1}` ? '\n\n' : '\n');
      }
      indent(--tabs);
      append('}\n');
    }

    accumulator += stack.pop();
  }

  // Determines the most appropriate type value
  function typeValue(val) {
    if (val === null)
      return '{}';

    switch (typeof val) {
      case 'string':
        return 'string;';
      case 'number':
        return 'number;';
      case 'boolean':
        return 'boolean;';
      case 'object':
        return Array.isArray(val) ? '[];' : '{};';
      default:
        return '{};';
    }
  }

  function getTypeValueDecorators(val, keyName) {
    if (val === null)
      return [];

    switch (typeof val) {
      case 'string':
        if (/\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?(\+\d\d:\d\d|Z)/.test(val)) {
          return ['@IsDateString()'];
        }
        return ['@IsString()', '@IsNotEmpty()'];
      case 'number':
        return ['@IsNumber()'];
      case 'boolean':
        return ['@IsBoolean()'];
      case 'object':
        if (Array.isArray(val)) {
          return ['@IsArray()', '@ValidateNested({ each: true })', `@Type(() => ${formatObjectName(keyName)})`];
        }
        return ['@ValidateNested()', `@Type(() => ${formatObjectName(keyName)})`];
      default:
        return [];
    }
  }

  function compareObjectKeys(itemAKeys, itemBKeys) {
    const lengthA = itemAKeys.length;
    const lengthB = itemBKeys.length;

    // nothing to compare, probably identical
    if (lengthA == 0 && lengthB == 0)
      return true;

    // duh
    if (lengthA != lengthB)
      return false;

    for (let item of itemAKeys) {
      if (!itemBKeys.includes(item))
        return false;
    }
    return true;
  }

  function formatScopeKeys(keys) {
    for (let i in keys) {
      keys[i] = format(keys[i]);
    }
    return keys
  }

  ///////////////////////////////
  // Build structure functions //
  ///////////////////////////////

  function append(str) {
    content += str;
  }

  function appender(str) {
    stack[stack.length - 1] += str;
  }

  function indent(tabs) {
    for (let i = 0; i < tabs; i++)
      content += '  ';
  }

  function indenter(tabs) {
    for (let i = 0; i < tabs; i++)
      stack[stack.length - 1] += '  ';
  }
}

if (typeof module != 'undefined') {
  if (!module.parent) {
    if (process.argv.length > 2 && process.argv[2] === '-big') {
      bufs = []
      process.stdin.on('data', function (buf) {
        bufs.push(buf)
      })
      process.stdin.on('end', function () {
        const json = Buffer.concat(bufs).toString('utf8')
        console.log(jsonToNest(json).content)
      })
    } else {
      process.stdin.on('data', function (buf) {
        const json = buf.toString('utf8')
        console.log(jsonToNest(json).content)
      })
    }
  } else {
    module.exports = jsonToNest
  }
}
