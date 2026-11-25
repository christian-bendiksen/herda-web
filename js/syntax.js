/* Malm 3 Documentation: Deterministic Single-Pass Syntax Highlighter
 * Exposes window.MalmSyntax = { escapeHtml, highlight }
 * Zero dependencies, classic script (file:// and http:// compatible).
 */
(function (global) {
  'use strict';

  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function span(cls, text) {
    return '<span class="tok-' + cls + '">' + escapeHtml(text) + '</span>';
  }

  function isIdentStart(ch) {
    if (!ch) return false;
    var c = ch.charCodeAt(0);
    return (c >= 65 && c <= 90) || (c >= 97 && c <= 122) || c === 95;
  }

  function isIdentPart(ch) {
    if (!ch) return false;
    var c = ch.charCodeAt(0);
    return (
      (c >= 65 && c <= 90) ||
      (c >= 97 && c <= 122) ||
      (c >= 48 && c <= 57) ||
      c === 95
    );
  }

  function isDigit(ch) {
    if (!ch) return false;
    var c = ch.charCodeAt(0);
    return c >= 48 && c <= 57;
  }

  function isHexDigit(ch) {
    if (!ch) return false;
    var c = ch.charCodeAt(0);
    return (
      (c >= 48 && c <= 57) ||
      (c >= 65 && c <= 70) ||
      (c >= 97 && c <= 102)
    );
  }

  function isWs(ch) {
    return ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r';
  }

  // Malm 3 Token Inventory
  var MALM_KEYWORDS = Object.create(null);
  [
    // Header & authority
    'malm', 'authority', 'os', 'user',
    // Structural declarations
    'pack', 'import', 'mod', 'use', 'pub', 'as', 'crate', 'axis', 'slot', 'impl',
    'module', 'extend', 'override', 'overlay', 'package', 'layer', 'machine',
    'profile', 'system', 'struct', 'enum', 'type', 'where', 'fn', 'let', 'mut',
    'const', 'export', 'fact',
    // Module / layer / output / resource keywords
    'doc', 'requires', 'option', 'render', 'using', 'file', 'dir', 'link',
    'from', 'to', 'mode', 'modules', 'workpiece', 'app', 'min', 'max',
    // Control flow
    'if', 'else', 'match', 'for', 'in', 'while', 'break', 'continue', 'return'
  ].forEach(function (w) { MALM_KEYWORDS[w] = true; });

  var TPL_EXTRA_KEYWORDS = Object.create(null);
  ['elif', 'endif', 'endfor'].forEach(function (w) { TPL_EXTRA_KEYWORDS[w] = true; });

  var MALM_BOOL_VARIANTS = Object.create(null);
  ['true', 'false', 'Some', 'None', 'Ok', 'Err'].forEach(function (w) {
    MALM_BOOL_VARIANTS[w] = true;
  });

  var MALM_TYPES = Object.create(null);
  [
    'bool', 'int', 'float', 'string', 'color', 'path', 'any',
    'Option', 'Result', 'List', 'list', 'Map', 'map'
  ].forEach(function (w) { MALM_TYPES[w] = true; });

  var MALM_FORMATS = Object.create(null);
  ['json', 'toml', 'kdl', 'ini', 'xml', 'text', 'tpl', 'template'].forEach(function (w) {
    MALM_FORMATS[w] = true;
  });

  var MALM_OS_NAMESPACES = Object.create(null);
  [
    'systemd', 'pam', 'polkit', 'dbus', 'portal', 'nft',
    'sysuser', 'sysgroup', 'group', 'tmpfile', 'capsule', 'contract'
  ].forEach(function (w) { MALM_OS_NAMESPACES[w] = true; });

  var MALM_OS_SUBRESOURCES = Object.create(null);
  [
    'service', 'timer', 'socket', 'path', 'dropin', 'user_service',
    'user_dropin', 'enable', 'disable', 'action', 'rule', 'backend', 'table'
  ].forEach(function (w) { MALM_OS_SUBRESOURCES[w] = true; });

  var MALM_STDLIB_NS = Object.create(null);
  [
    'color', 'shell', 'math', 'path', 'json', 'hash',
    'theme', 'scopes', 'os_facts', 'slots'
  ].forEach(function (w) { MALM_STDLIB_NS[w] = true; });

  var MALM_RUNTIME_NS = Object.create(null);
  ['theme', 'scopes', 'os_facts', 'slots'].forEach(function (w) {
    MALM_RUNTIME_NS[w] = true;
  });

  var MALM_MUTATION_OPS = Object.create(null);
  [
    'patch', 'insert', 'extend', 'remove', 'remove_all',
    'push', 'push_front', 'prepend',
    'replace_once', 'append_lines', 'prepend_lines', 'insert_after_once'
  ].forEach(function (w) { MALM_MUTATION_OPS[w] = true; });

  var MALM_MACROS = Object.create(null);
  ['assert', 'warn', 'format', 'todo', 'unreachable'].forEach(function (w) {
    MALM_MACROS[w] = true;
  });

  var MALM_ATTR_NAMES = Object.create(null);
  [
    'priority', 'default', 'force', 'order', 'notify', 'scope', 'scope_only',
    'machine_only', 'sentence', 'sentence_prefix', 'sensitive', 'wire', 'deprecated'
  ].forEach(function (w) { MALM_ATTR_NAMES[w] = true; });

  function nextNonWsChar(code, idx) {
    var n = code.length;
    while (idx < n && isWs(code[idx])) idx++;
    return idx < n ? code[idx] : '';
  }

  function scanInterpolatedString(code, startIdx, isMultiline, out, extraTplKw) {
    var n = code.length;
    var i = startIdx + (isMultiline ? 3 : 1);
    var segStart = startIdx;

    function flushStr(endIdx) {
      if (endIdx > segStart) {
        out.push(span('str', code.slice(segStart, endIdx)));
      }
    }

    while (i < n) {
      var ch = code[i];

      // End of string
      if (isMultiline) {
        if (ch === '"' && code[i + 1] === '"' && code[i + 2] === '"') {
          i += 3;
          flushStr(i);
          return i;
        }
      } else {
        if (ch === '"') {
          i += 1;
          flushStr(i);
          return i;
        }
        if (ch === '\n') {
          flushStr(i);
          return i;
        }
      }

      // Escape sequence
      if (ch === '\\' && i + 1 < n) {
        i += 2;
        continue;
      }

      // Interpolation ${ ... }
      if (ch === '$' && code[i + 1] === '{') {
        flushStr(i);
        out.push(span('interp', '${'));
        i += 2;
        var exprStart = i;
        var depth = 1;
        while (i < n && depth > 0) {
          var ic = code[i];
          if (ic === '"') {
            // Skip nested string inside interpolation
            i++;
            while (i < n && code[i] !== '"') {
              if (code[i] === '\\' && i + 1 < n) i += 2;
              else i++;
            }
            if (i < n) i++;
            continue;
          }
          if (ic === '{') depth++;
          else if (ic === '}') {
            depth--;
            if (depth === 0) break;
          }
          i++;
        }
        var exprText = code.slice(exprStart, i);
        if (exprText.length > 0) {
          out.push(highlightMalmInternal(exprText, extraTplKw));
        }
        if (i < n && code[i] === '}') {
          out.push(span('interp', '}'));
          i++;
        }
        segStart = i;
        continue;
      }

      i++;
    }

    flushStr(i);
    return i;
  }

  function scanAttribute(code, startIdx, out) {
    // Starts at '#['
    var n = code.length;
    var i = startIdx + 2;
    out.push(span('attr', '#['));
    var depth = 1;

    while (i < n && depth > 0) {
      var ch = code[i];
      if (isWs(ch)) {
        var wsStart = i;
        while (i < n && isWs(code[i])) i++;
        out.push(escapeHtml(code.slice(wsStart, i)));
        continue;
      }
      if (ch === '"') {
        i = scanInterpolatedString(code, i, false, out, false);
        continue;
      }
      if (isDigit(ch) || (ch === '-' && isDigit(code[i + 1]))) {
        var numStart = i;
        if (ch === '-') i++;
        while (i < n && (isDigit(code[i]) || code[i] === '_')) i++;
        out.push(span('num', code.slice(numStart, i)));
        continue;
      }
      if (isIdentStart(ch)) {
        var idStart = i;
        i++;
        while (i < n && isIdentPart(code[i])) i++;
        var word = code.slice(idStart, i);
        if (word === 'true' || word === 'false') {
          out.push(span('bool', word));
        } else {
          out.push(span('attr', word));
        }
        continue;
      }
      if (ch === '[') {
        depth++;
        out.push(span('attr', ch));
        i++;
        continue;
      }
      if (ch === ']') {
        depth--;
        out.push(span('attr', ch));
        i++;
        continue;
      }
      out.push(span('attr', ch));
      i++;
    }

    return i;
  }

  function highlightMalmInternal(code, extraTplKw) {
    var n = code.length;
    var i = 0;
    var out = [];
    var prevTok = '';
    var prevWord = '';

    while (i < n) {
      var ch = code[i];

      // Whitespace (preserve verbatim)
      if (isWs(ch)) {
        var wsStart = i;
        while (i < n && isWs(code[i])) i++;
        out.push(escapeHtml(code.slice(wsStart, i)));
        continue;
      }

      // Line comment //
      if (ch === '/' && code[i + 1] === '/') {
        var lcStart = i;
        i += 2;
        while (i < n && code[i] !== '\n') i++;
        out.push(span('comment', code.slice(lcStart, i)));
        continue;
      }

      // Nestable block comment /* /* ... */ */
      if (ch === '/' && code[i + 1] === '*') {
        var bcStart = i;
        var bcDepth = 1;
        i += 2;
        while (i < n && bcDepth > 0) {
          if (code[i] === '/' && code[i + 1] === '*') {
            bcDepth++;
            i += 2;
          } else if (code[i] === '*' && code[i + 1] === '/') {
            bcDepth--;
            i += 2;
          } else {
            i++;
          }
        }
        out.push(span('comment', code.slice(bcStart, i)));
        continue;
      }

      // Attribute #[...]
      if (ch === '#' && code[i + 1] === '[') {
        i = scanAttribute(code, i, out);
        prevTok = ']';
        prevWord = '';
        continue;
      }

      // Raw string r"..." or r#"..."#
      if (ch === 'r') {
        var rj = i + 1;
        while (rj < n && code[rj] === '#') rj++;
        if (rj < n && code[rj] === '"') {
          var hashes = rj - (i + 1);
          var rawStart = i;
          i = rj + 1;
          while (i < n) {
            if (code[i] === '"') {
              var hCount = 0;
              while (hCount < hashes && code[i + 1 + hCount] === '#') hCount++;
              if (hCount === hashes) {
                i = i + 1 + hashes;
                break;
              }
            }
            i++;
          }
          out.push(span('str', code.slice(rawStart, i)));
          prevTok = 'str';
          prevWord = '';
          continue;
        }
      }

      // Multiline string """..."""
      if (ch === '"' && code[i + 1] === '"' && code[i + 2] === '"') {
        i = scanInterpolatedString(code, i, true, out, extraTplKw);
        prevTok = 'str';
        prevWord = '';
        continue;
      }

      // Single-line string "..."
      if (ch === '"') {
        i = scanInterpolatedString(code, i, false, out, extraTplKw);
        prevTok = 'str';
        prevWord = '';
        continue;
      }

      // Numbers (hex, oct, bin, decimal, float, scientific)
      if (isDigit(ch)) {
        var numStart = i;
        if (ch === '0' && (code[i + 1] === 'x' || code[i + 1] === 'X')) {
          i += 2;
          while (i < n && (isHexDigit(code[i]) || code[i] === '_')) i++;
        } else if (ch === '0' && (code[i + 1] === 'o' || code[i + 1] === 'O')) {
          i += 2;
          while (i < n && ((code[i] >= '0' && code[i] <= '7') || code[i] === '_')) i++;
        } else if (ch === '0' && (code[i + 1] === 'b' || code[i + 1] === 'B')) {
          i += 2;
          while (i < n && (code[i] === '0' || code[i] === '1' || code[i] === '_')) i++;
        } else {
          while (i < n && (isDigit(code[i]) || code[i] === '_')) i++;
          // Fractional part: only if '.' followed by digit (not '..' range)
          if (code[i] === '.' && isDigit(code[i + 1])) {
            i++;
            while (i < n && (isDigit(code[i]) || code[i] === '_')) i++;
          }
          // Scientific notation
          if (code[i] === 'e' || code[i] === 'E') {
            var expPos = i + 1;
            if (code[expPos] === '+' || code[expPos] === '-') expPos++;
            if (isDigit(code[expPos])) {
              i = expPos;
              while (i < n && (isDigit(code[i]) || code[i] === '_')) i++;
            }
          }
        }
        out.push(span('num', code.slice(numStart, i)));
        prevTok = 'num';
        prevWord = '';
        continue;
      }

      // Identifiers, keywords, types, namespaces, macros, functions
      if (isIdentStart(ch)) {
        var idStart = i;
        i++;
        while (i < n && isIdentPart(code[i])) i++;
        var word = code.slice(idStart, i);

        // Macro invocation name!
        if (code[i] === '!' && code[i + 1] !== '=') {
          i++;
          out.push(span('fn', word + '!'));
          prevTok = 'ident';
          prevWord = word + '!';
          continue;
        }

        var nextCh = code[i] || '';
        var nextNonWs = nextNonWsChar(code, i);
        var cls = null;

        if (prevTok === '.') {
          // Member access / method call / collection mutation op
          if (MALM_MUTATION_OPS[word] || nextCh === '(') {
            cls = 'fn';
          } else {
            cls = null; // plain field access
          }
        } else if (prevTok === '::') {
          if (MALM_OS_SUBRESOURCES[word]) {
            cls = 'type';
          } else if (word[0] >= 'A' && word[0] <= 'Z') {
            cls = 'type';
          } else if (nextCh === '(') {
            cls = 'fn';
          } else {
            cls = null;
          }
        } else if (prevWord === 'as' || prevWord === 'overlay') {
          if (MALM_FORMATS[word]) {
            cls = 'type';
          } else if (MALM_KEYWORDS[word]) {
            cls = 'kw';
          } else if (word[0] >= 'A' && word[0] <= 'Z') {
            cls = 'type';
          }
        } else if (MALM_BOOL_VARIANTS[word]) {
          cls = 'bool';
        } else if (extraTplKw && TPL_EXTRA_KEYWORDS[word]) {
          cls = 'kw';
        } else if (
          (MALM_STDLIB_NS[word] && nextCh === '.') ||
          MALM_RUNTIME_NS[word]
        ) {
          cls = 'ns';
        } else if (
          MALM_OS_NAMESPACES[word] &&
          (nextCh === ':' || nextNonWs === '"' || nextNonWs === '{')
        ) {
          cls = 'ns';
        } else if (MALM_KEYWORDS[word]) {
          // Avoid classifying map keys like `mode: ...` or `min: 1` if followed by ':' (not '::')
          if (
            (word === 'min' || word === 'max' || word === 'mode' || word === 'from' || word === 'to' || word === 'doc') &&
            nextCh === ':' &&
            code[i + 1] !== ':'
          ) {
            cls = null;
          } else if (word === 'user' && prevWord !== 'authority' && nextNonWs === '"') {
            cls = 'ns';
          } else {
            cls = 'kw';
          }
        } else if (MALM_TYPES[word]) {
          cls = 'type';
        } else if (MALM_OS_NAMESPACES[word]) {
          cls = 'ns';
        } else if (MALM_MUTATION_OPS[word] && nextCh === '(') {
          cls = 'fn';
        } else if (nextCh === '(') {
          if (word[0] >= 'A' && word[0] <= 'Z') {
            cls = 'type';
          } else {
            cls = 'fn';
          }
        } else if (word[0] >= 'A' && word[0] <= 'Z' && /[a-z]/.test(word)) {
          cls = 'type';
        }

        if (cls) {
          out.push(span(cls, word));
        } else {
          out.push(escapeHtml(word));
        }
        prevTok = 'ident';
        prevWord = word;
        continue;
      }

      // Three-char operators
      if (ch === '.' && code[i + 1] === '.' && code[i + 2] === '=') {
        out.push(span('op', '..='));
        i += 3;
        prevTok = '..=';
        prevWord = '';
        continue;
      }

      // Two-char operators
      var two = code.slice(i, i + 2);
      if (
        two === '..' || two === '::' || two === '->' || two === '=>' ||
        two === '==' || two === '!=' || two === '<=' || two === '>=' ||
        two === '&&' || two === '||' || two === '++'
      ) {
        out.push(span('op', two));
        i += 2;
        prevTok = two;
        prevWord = '';
        continue;
      }

      // Single-char operators
      if ('=+-*/%!<>|@'.indexOf(ch) !== -1) {
        out.push(span('op', ch));
        i++;
        prevTok = ch;
        prevWord = '';
        continue;
      }

      // Punctuation
      out.push(escapeHtml(ch));
      prevTok = ch;
      prevWord = '';
      i++;
    }

    return out.join('');
  }

  function highlightMalm(code) {
    return highlightMalmInternal(code, false);
  }

  // .tpl Template Highlighter ({{ }}, {% %}, {# #})
  function highlightTpl(code) {
    var n = code.length;
    var i = 0;
    var out = [];

    while (i < n) {
      // Comment {# ... #}
      if (code[i] === '{' && code[i + 1] === '#') {
        var cStart = i;
        var cEnd = code.indexOf('#}', i + 2);
        if (cEnd === -1) {
          out.push(span('comment', code.slice(cStart)));
          break;
        }
        out.push(span('comment', code.slice(cStart, cEnd + 2)));
        i = cEnd + 2;
        continue;
      }

      // Expression {{ ... }} or {{- ... -}}
      if (code[i] === '{' && code[i + 1] === '{') {
        var openTrim = code[i + 2] === '-';
        var openTok = openTrim ? '{{-' : '{{';
        var innerStart = i + openTok.length;
        var closeIdx = code.indexOf('}}', innerStart);
        if (closeIdx === -1) {
          out.push(escapeHtml(code.slice(i)));
          break;
        }
        var closeTrim = closeIdx > innerStart && code[closeIdx - 1] === '-';
        var innerEnd = closeTrim ? closeIdx - 1 : closeIdx;
        var closeTok = closeTrim ? '-}}' : '}}';
        out.push(span('interp', openTok));
        out.push(highlightMalmInternal(code.slice(innerStart, innerEnd), true));
        out.push(span('interp', closeTok));
        i = closeIdx + 2;
        continue;
      }

      // Tag {% ... %} or {%- ... -%}
      if (code[i] === '{' && code[i + 1] === '%') {
        var tOpenTrim = code[i + 2] === '-';
        var tOpenTok = tOpenTrim ? '{%-' : '{%';
        var tInnerStart = i + tOpenTok.length;
        var tCloseIdx = code.indexOf('%}', tInnerStart);
        if (tCloseIdx === -1) {
          out.push(escapeHtml(code.slice(i)));
          break;
        }
        var tCloseTrim = tCloseIdx > tInnerStart && code[tCloseIdx - 1] === '-';
        var tInnerEnd = tCloseTrim ? tCloseIdx - 1 : tCloseIdx;
        var tCloseTok = tCloseTrim ? '-%}' : '%}';
        out.push(span('interp', tOpenTok));
        out.push(highlightMalmInternal(code.slice(tInnerStart, tInnerEnd), true));
        out.push(span('interp', tCloseTok));
        i = tCloseIdx + 2;
        continue;
      }

      // Plain text until next '{'
      var txtStart = i;
      i++;
      while (
        i < n &&
        !(code[i] === '{' && (code[i + 1] === '{' || code[i + 1] === '%' || code[i + 1] === '#'))
      ) {
        i++;
      }
      out.push(escapeHtml(code.slice(txtStart, i)));
    }

    return out.join('');
  }

  // Shell Highlighter (commands, subcommands, --flags, strings, # comments, $VARS)
  var SH_SUBCOMMANDS = Object.create(null);
  [
    'source', 'plan', 'deploy', 'switch', 'why', 'resolve', 'fmt', 'check',
    'render', 'vars', 'fork', 'active', 'workshop', 'lock', 'create', 'update',
    'show', 'apply', 'track', 'refresh', 'customize', 'restore', 'disable',
    'enable', 'remove', 'retention', 'list', 'delete', 'inputs', 'artifact',
    'export', 'import', 'history', 'reset', 'statement', 'at', 'rewind',
    'scope', 'rename', 'copy', 'drop', 'propose', 'proposal', 'accept',
    'decline', 'discard', 'namespace', 'profiles', 'customizations', 'status',
    'generation', 'desired', 'tracking', 'store', 'init', 'verify', 'recover',
    'gc', 'object', 'tree', 'machine', 'switch-profile'
  ].forEach(function (w) { SH_SUBCOMMANDS[w] = true; });

  function highlightSh(code) {
    var n = code.length;
    var i = 0;
    var out = [];
    var atCmdPos = true;
    var afterMalm = false;

    while (i < n) {
      var ch = code[i];

      if (ch === '\n') {
        out.push('\n');
        i++;
        atCmdPos = true;
        afterMalm = false;
        continue;
      }

      if (ch === ' ' || ch === '\t' || ch === '\r') {
        var wsStart = i;
        while (i < n && (code[i] === ' ' || code[i] === '\t' || code[i] === '\r')) i++;
        out.push(escapeHtml(code.slice(wsStart, i)));
        continue;
      }

      // Line comment
      if (ch === '#' && (i === 0 || isWs(code[i - 1]))) {
        var cStart = i;
        while (i < n && code[i] !== '\n') i++;
        out.push(span('comment', code.slice(cStart, i)));
        continue;
      }

      // Prompt "$ " at start of line
      if (atCmdPos && ch === '$' && code[i + 1] === ' ') {
        out.push(span('op', '$'));
        i++;
        continue;
      }

      // Line continuation
      if (ch === '\\' && code[i + 1] === '\n') {
        out.push(span('op', '\\') + '\n');
        i += 2;
        continue;
      }

      // Operators
      var two = code.slice(i, i + 2);
      if (two === '&&' || two === '||' || two === '>>') {
        out.push(span('op', two));
        i += 2;
        if (two !== '>>') {
          atCmdPos = true;
          afterMalm = false;
        }
        continue;
      }
      if (ch === '|' || ch === ';' || ch === '>' || ch === '<') {
        out.push(span('op', ch));
        i++;
        if (ch === '|' || ch === ';') {
          atCmdPos = true;
          afterMalm = false;
        }
        continue;
      }

      // Single-quoted string
      if (ch === '\'') {
        var sqStart = i;
        i++;
        while (i < n && code[i] !== '\'') i++;
        if (i < n) i++;
        out.push(span('str', code.slice(sqStart, i)));
        atCmdPos = false;
        continue;
      }

      // Double-quoted string (highlight $VAR / ${VAR} inside)
      if (ch === '"') {
        var segStart = i;
        i++;
        while (i < n && code[i] !== '"') {
          if (code[i] === '\\' && i + 1 < n) {
            i += 2;
            continue;
          }
          if (code[i] === '$' && (code[i + 1] === '{' || isIdentStart(code[i + 1]))) {
            if (i > segStart) out.push(span('str', code.slice(segStart, i)));
            var vStart = i;
            i++;
            if (code[i] === '{') {
              while (i < n && code[i] !== '}') i++;
              if (i < n) i++;
            } else {
              while (i < n && isIdentPart(code[i])) i++;
            }
            out.push(span('interp', code.slice(vStart, i)));
            segStart = i;
            continue;
          }
          i++;
        }
        if (i < n) i++;
        if (i > segStart) out.push(span('str', code.slice(segStart, i)));
        atCmdPos = false;
        continue;
      }

      // Env var $VAR or ${VAR}
      if (ch === '$' && (code[i + 1] === '{' || isIdentStart(code[i + 1]))) {
        var envStart = i;
        i++;
        if (code[i] === '{') {
          while (i < n && code[i] !== '}') i++;
          if (i < n) i++;
        } else {
          while (i < n && isIdentPart(code[i])) i++;
        }
        out.push(span('interp', code.slice(envStart, i)));
        atCmdPos = false;
        continue;
      }

      // Flags --foo / -v (split on '=' so value highlights cleanly)
      if (ch === '-' && (i === 0 || isWs(code[i - 1])) && code[i + 1] && !isWs(code[i + 1])) {
        var flStart = i;
        while (i < n && !isWs(code[i]) && code[i] !== '=' && code[i] !== ';' && code[i] !== '|') {
          i++;
        }
        out.push(span('attr', code.slice(flStart, i)));
        if (code[i] === '=') {
          out.push(span('op', '='));
          i++;
        }
        atCmdPos = false;
        continue;
      }

      // Word token
      var wStart = i;
      while (
        i < n &&
        !isWs(code[i]) &&
        '|;&<>\"\''.indexOf(code[i]) === -1 &&
        !(code[i] === '$' && (code[i + 1] === '{' || isIdentStart(code[i + 1])))
      ) {
        i++;
      }
      var word = code.slice(wStart, i);

      // ENV_VAR=value assignment before command
      var eqIdx = word.indexOf('=');
      if (atCmdPos && eqIdx > 0 && /^[A-Z_][A-Z0-9_]*$/.test(word.slice(0, eqIdx))) {
        out.push(span('ns', word.slice(0, eqIdx)));
        out.push(span('op', '='));
        out.push(span('str', word.slice(eqIdx + 1)));
        continue;
      }

      if (atCmdPos) {
        if (word === 'malm' || word === 'malmd' || word === 'malm-lsp') {
          out.push(span('fn', word));
          afterMalm = true;
        } else {
          out.push(span('fn', word));
        }
        atCmdPos = false;
      } else if (afterMalm && SH_SUBCOMMANDS[word]) {
        out.push(span('kw', word));
      } else {
        out.push(escapeHtml(word));
      }
    }

    return out.join('');
  }

  // JSON Highlighter
  function highlightJson(code) {
    var n = code.length;
    var i = 0;
    var out = [];

    while (i < n) {
      var ch = code[i];

      if (isWs(ch)) {
        var wsStart = i;
        while (i < n && isWs(code[i])) i++;
        out.push(escapeHtml(code.slice(wsStart, i)));
        continue;
      }

      // Optional // comments in annotated JSON snippets
      if (ch === '/' && code[i + 1] === '/') {
        var cStart = i;
        while (i < n && code[i] !== '\n') i++;
        out.push(span('comment', code.slice(cStart, i)));
        continue;
      }

      // String (key if followed by ':')
      if (ch === '"') {
        var sStart = i;
        i++;
        while (i < n && code[i] !== '"') {
          if (code[i] === '\\' && i + 1 < n) i += 2;
          else i++;
        }
        if (i < n) i++;
        var text = code.slice(sStart, i);
        var nextCh = nextNonWsChar(code, i);
        out.push(span(nextCh === ':' ? 'key' : 'str', text));
        continue;
      }

      // Number
      if (isDigit(ch) || (ch === '-' && isDigit(code[i + 1]))) {
        var numStart = i;
        if (ch === '-') i++;
        while (i < n && isDigit(code[i])) i++;
        if (code[i] === '.' && isDigit(code[i + 1])) {
          i++;
          while (i < n && isDigit(code[i])) i++;
        }
        if (code[i] === 'e' || code[i] === 'E') {
          i++;
          if (code[i] === '+' || code[i] === '-') i++;
          while (i < n && isDigit(code[i])) i++;
        }
        out.push(span('num', code.slice(numStart, i)));
        continue;
      }

      // Literals true / false / null
      if (isIdentStart(ch)) {
        var idStart = i;
        while (i < n && isIdentPart(code[i])) i++;
        var w = code.slice(idStart, i);
        if (w === 'true' || w === 'false' || w === 'null') {
          out.push(span('bool', w));
        } else {
          out.push(escapeHtml(w));
        }
        continue;
      }

      if (ch === ':') {
        out.push(span('op', ':'));
        i++;
        continue;
      }

      out.push(escapeHtml(ch));
      i++;
    }

    return out.join('');
  }

  // TOML Highlighter
  function highlightToml(code) {
    var lines = code.split('\n');
    return lines.map(function (line) {
      var trimmed = line.trim();
      if (!trimmed) return escapeHtml(line);

      // Whole-line comment
      if (trimmed[0] === '#') {
        return span('comment', line);
      }

      // Section header [section] or [[array]]
      if (trimmed[0] === '[') {
        var hashIdx = line.indexOf('#');
        if (hashIdx !== -1) {
          return span('attr', line.slice(0, hashIdx)) + span('comment', line.slice(hashIdx));
        }
        return span('attr', line);
      }

      var n = line.length;
      var i = 0;
      var out = [];
      var seenEq = false;

      while (i < n) {
        var ch = line[i];

        if (ch === ' ' || ch === '\t') {
          var wsStart = i;
          while (i < n && (line[i] === ' ' || line[i] === '\t')) i++;
          out.push(escapeHtml(line.slice(wsStart, i)));
          continue;
        }

        if (ch === '#') {
          out.push(span('comment', line.slice(i)));
          break;
        }

        if (ch === '"' || ch === '\'') {
          var q = ch;
          var sStart = i;
          i++;
          while (i < n && line[i] !== q) {
            if (q === '"' && line[i] === '\\' && i + 1 < n) i += 2;
            else i++;
          }
          if (i < n) i++;
          out.push(span(seenEq ? 'str' : 'key', line.slice(sStart, i)));
          continue;
        }

        if (!seenEq && ch === '=') {
          out.push(span('op', '='));
          seenEq = true;
          i++;
          continue;
        }

        if (!seenEq) {
          var kStart = i;
          while (i < n && line[i] !== '=' && line[i] !== ' ' && line[i] !== '\t' && line[i] !== '#') {
            i++;
          }
          out.push(span('key', line.slice(kStart, i)));
          continue;
        }

        if (isDigit(ch) || (ch === '-' && isDigit(line[i + 1]))) {
          var numStart = i;
          if (ch === '-') i++;
          while (i < n && (isDigit(line[i]) || line[i] === '.' || line[i] === '_' || line[i] === 'x' || isHexDigit(line[i]))) {
            i++;
          }
          out.push(span('num', line.slice(numStart, i)));
          continue;
        }

        if (isIdentStart(ch)) {
          var idStart = i;
          while (i < n && (isIdentPart(line[i]) || line[i] === '-')) i++;
          var w = line.slice(idStart, i);
          if (w === 'true' || w === 'false') out.push(span('bool', w));
          else out.push(escapeHtml(w));
          continue;
        }

        out.push(escapeHtml(ch));
        i++;
      }

      return out.join('');
    }).join('\n');
  }

  // KDL Highlighter
  function highlightKdl(code) {
    var n = code.length;
    var i = 0;
    var out = [];
    var atNodeStart = true;

    while (i < n) {
      var ch = code[i];

      if (ch === '\n' || ch === ';') {
        out.push(escapeHtml(ch));
        i++;
        atNodeStart = true;
        continue;
      }

      if (ch === ' ' || ch === '\t' || ch === '\r') {
        var wsStart = i;
        while (i < n && (code[i] === ' ' || code[i] === '\t' || code[i] === '\r')) i++;
        out.push(escapeHtml(code.slice(wsStart, i)));
        continue;
      }

      if (ch === '/' && code[i + 1] === '/') {
        var lcStart = i;
        while (i < n && code[i] !== '\n') i++;
        out.push(span('comment', code.slice(lcStart, i)));
        continue;
      }

      if (ch === '/' && code[i + 1] === '*') {
        var bcStart = i;
        var depth = 1;
        i += 2;
        while (i < n && depth > 0) {
          if (code[i] === '/' && code[i + 1] === '*') { depth++; i += 2; }
          else if (code[i] === '*' && code[i + 1] === '/') { depth--; i += 2; }
          else i++;
        }
        out.push(span('comment', code.slice(bcStart, i)));
        continue;
      }

      if (ch === '/' && code[i + 1] === '-') {
        out.push(span('comment', '/-'));
        i += 2;
        continue;
      }

      // Type annotation (type)
      if (ch === '(') {
        var tEnd = code.indexOf(')', i + 1);
        if (tEnd !== -1 && tEnd - i < 40) {
          out.push(span('type', code.slice(i, tEnd + 1)));
          i = tEnd + 1;
          continue;
        }
      }

      if (ch === '"') {
        var sStart = i;
        i++;
        while (i < n && code[i] !== '"') {
          if (code[i] === '\\' && i + 1 < n) i += 2;
          else i++;
        }
        if (i < n) i++;
        out.push(span('str', code.slice(sStart, i)));
        atNodeStart = false;
        continue;
      }

      if (ch === '#') {
        var hStart = i;
        i++;
        while (i < n && (isIdentPart(code[i]) || code[i] === '-')) i++;
        out.push(span('bool', code.slice(hStart, i)));
        atNodeStart = false;
        continue;
      }

      if (isDigit(ch) || (ch === '-' && isDigit(code[i + 1]))) {
        var numStart = i;
        if (ch === '-') i++;
        while (i < n && (isDigit(code[i]) || code[i] === '.' || code[i] === '_' || code[i] === 'e' || code[i] === 'E')) i++;
        out.push(span('num', code.slice(numStart, i)));
        atNodeStart = false;
        continue;
      }

      if (ch === '{' || ch === '}') {
        out.push(escapeHtml(ch));
        i++;
        atNodeStart = ch === '{';
        continue;
      }

      if (ch === '=') {
        out.push(span('op', '='));
        i++;
        continue;
      }

      if (isIdentStart(ch) || ch === '-') {
        var idStart = i;
        i++;
        while (i < n && (isIdentPart(code[i]) || code[i] === '-' || code[i] === '.' || code[i] === '/')) {
          i++;
        }
        var w = code.slice(idStart, i);
        if (code[i] === '=') {
          out.push(span('key', w));
        } else if (w === 'true' || w === 'false' || w === 'null') {
          out.push(span('bool', w));
        } else if (atNodeStart) {
          out.push(span('kw', w));
          atNodeStart = false;
        } else {
          out.push(escapeHtml(w));
        }
        continue;
      }

      out.push(escapeHtml(ch));
      i++;
    }

    return out.join('');
  }

  // Directory Tree Highlighter
  function highlightTree(code) {
    var lines = code.split('\n');
    return lines.map(function (line) {
      var commentIdx = line.indexOf('#');
      var body = commentIdx !== -1 ? line.slice(0, commentIdx) : line;
      var comment = commentIdx !== -1 ? line.slice(commentIdx) : '';

      var i = 0;
      var out = [];
      var n = body.length;
      while (i < n) {
        var ch = body[i];
        if ('├└│─┬┼┌┐┘'.indexOf(ch) !== -1) {
          var bStart = i;
          while (i < n && '├└│─┬┼┌┐┘'.indexOf(body[i]) !== -1) i++;
          out.push(span('op', body.slice(bStart, i)));
          continue;
        }
        if (ch === ' ' || ch === '\t') {
          var wsStart = i;
          while (i < n && (body[i] === ' ' || body[i] === '\t')) i++;
          out.push(escapeHtml(body.slice(wsStart, i)));
          continue;
        }
        var tokStart = i;
        while (i < n && body[i] !== ' ' && body[i] !== '\t' && '├└│─┬┼┌┐┘'.indexOf(body[i]) === -1) {
          i++;
        }
        var tok = body.slice(tokStart, i);
        if (tok.endsWith('/')) {
          out.push(span('path', tok));
        } else if (tok.endsWith('.malm') || tok.endsWith('.tpl')) {
          out.push(span('fn', tok));
        } else if (tok.endsWith('.json') || tok.endsWith('.kdl') || tok.endsWith('.toml') || tok.endsWith('.lock')) {
          out.push(span('str', tok));
        } else {
          out.push(escapeHtml(tok));
        }
      }

      if (comment) {
        out.push(span('comment', comment));
      }
      return out.join('');
    }).join('\n');
  }

  function highlight(code, lang) {
    var src = code == null ? '' : String(code);
    var l = (lang || 'text').toLowerCase().trim();
    switch (l) {
      case 'malm':
      case 'malm3':
        return highlightMalm(src);
      case 'tpl':
      case 'template':
        return highlightTpl(src);
      case 'sh':
      case 'bash':
      case 'shell':
      case 'zsh':
        return highlightSh(src);
      case 'json':
      case 'jsonc':
        return highlightJson(src);
      case 'toml':
        return highlightToml(src);
      case 'kdl':
        return highlightKdl(src);
      case 'tree':
        return highlightTree(src);
      case 'text':
      default:
        return escapeHtml(src);
    }
  }

  global.MalmSyntax = {
    escapeHtml: escapeHtml,
    highlight: highlight
  };
})(typeof window !== 'undefined' ? window : globalThis);
