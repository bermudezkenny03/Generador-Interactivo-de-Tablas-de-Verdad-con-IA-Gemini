

var kScannerConstants;
function trueNode() {}
function falseNode() {}
function negateNode(e) {
    this.underlying = e
}
function andNode(e, t) {
    this.lhs = e,
    this.rhs = t
}
function orNode(e, t) {
    this.lhs = e,
    this.rhs = t
}
function impliesNode(e, t) {
    this.lhs = e,
    this.rhs = t
}
function iffNode(e, t) {
    this.lhs = e,
    this.rhs = t
}
function variableNode(e) {
    this.index = e
}
function go() {
    var e = document.getElementById("expressionInput").value;
    try {
        prettyPrintTruthTable(parse(e))
    } catch (t) {
        if (void 0 !== t.description)
            displayCompileError(e, t);
        else
            throw t
    }
}
function assert(e, t) {
    if (!1 === e)
        throw Error("Assertion failed: " + t)
}
function unreachable(e) {
    throw Error("Unreachable code: " + e)
}
function parse(e) {
    var t = scan(e)
      , r = t.tokens
      , n = []
      , a = []
      , o = !0;
    for (var i in r) {
        var s = r[i];
        if (o)
            isOperand(s) ? (addOperand(wrapOperand(s), a, n),
            o = !1) : "(" === s.type || "~" === s.type ? n.push(s) : s.type === kScannerConstants.EOF ? (0 === n.length && parseError("", 0, 0),
            "(" === topOf(n).type && parseError("This open parenthesis has no matching close parenthesis.", topOf(n).start, topOf(n).end),
            parseError("This operator is missing an operand.", topOf(n).start, topOf(n).end)) : parseError("We were expecting a variable, constant, or open parenthesis here.", s.start, s.end);
        else if (isBinaryOperator(s) || s.type === kScannerConstants.EOF) {
            for (; !(0 === n.length || "(" === topOf(n).type || priorityOf(topOf(n)) <= priorityOf(s)); ) {
                var p = n.pop()
                  , l = a.pop()
                  , u = a.pop();
                addOperand(createOperatorNode(u, p, l), a, n)
            }
            if (n.push(s),
            o = !0,
            s.type === kScannerConstants.EOF)
                break
        } else if (")" === s.type) {
            for (; ; ) {
                0 === n.length && parseError("This close parenthesis doesn't match any open parenthesis.", s.start, s.end);
                var h = n.pop();
                if ("(" === h.type)
                    break;
                "~" === h.type && parseError("Nothing is negated by this operator.", h.start, h.end);
                var l = a.pop()
                  , u = a.pop();
                addOperand(createOperatorNode(u, h, l), a, n)
            }
            addOperand(a.pop(), a, n)
        } else
            parseError("We were expecting a close parenthesis or a binary connective here.", s.start, s.end)
    }
    if (assert(0 !== n.length, "No operators on the operator stack (logic error in parser?)"),
    assert(n.pop().type === kScannerConstants.EOF, "Stack top is not EOF (logic error in parser?)"),
    0 !== n.length) {
        var d = n.pop();
        assert("(" === d.type, "Somehow missed an operator factoring in EOF (logic error in parser?)"),
        parseError("No matching close parenthesis for this open parenthesis.", d.start, d.end)
    }
    return {
        ast: a.pop(),
        variables: t.variables
    }
}
function addOperand(e, t, r) {
    for (; r.length > 0 && "~" === topOf(r).type; )
        r.pop(),
        e = new negateNode(e);
    t.push(e)
}
function isOperand(e) {
    return "T" === e.type || "F" === e.type || "variable" === e.type
}
function wrapOperand(e) {
    return "T" === e.type ? new trueNode : "F" === e.type ? new falseNode : "variable" === e.type ? new variableNode(e.index) : void unreachable("Token " + e.type + " isn't an operand.")
}
function isBinaryOperator(e) {
    return "<->" === e.type || "->" === e.type || "/\\" === e.type || "\\/" === e.type
}
function priorityOf(e) {
    return e.type === kScannerConstants.EOF ? -1 : "<->" === e.type ? 0 : "->" === e.type ? 1 : "\\/" === e.type ? 2 : "/\\" === e.type ? 3 : void unreachable("Should never need the priority of " + e.type)
}
function createOperatorNode(e, t, r) {
    return "<->" === t.type ? new iffNode(e,r) : "->" === t.type ? new impliesNode(e,r) : "\\/" === t.type ? new orNode(e,r) : "/\\" === t.type ? new andNode(e,r) : void unreachable("Should never need to create an operator node from " + t.type)
}
function topOf(e) {
    return assert(0 !== e.length, "Can't get the top of an empty array."),
    e[e.length - 1]
}
function parseError(e, t, r) {
    throw {
        description: e,
        start: t,
        end: r
    }
}
function prettyPrintTruthTable(e) {
    var t = createTableElement();
    createTableHeader(t, e),
    generateTruthTable(e, outputRow(t)),
    displayTable(t)
}
function createTableElement() {
    var e = document.createElement("table");
    return e.className = "truthTable",
    e
}
function createTableHeader(e, t) {
    var r = document.createElement("tr");
    r.className = "header";
    for (var n = 0; n < t.variables.length; n++) {
        var a = document.createElement("th");
        a.className = "variable",
        a.innerHTML = t.variables[n],
        r.appendChild(a)
    }
    var o = document.createElement("th");
    o.className = "expression",
    o.innerHTML = t.ast.toString(t.variables),
    r.appendChild(o),
    e.appendChild(r)
}
function outputRow(e) {
    return function(t, r) {
        var n = document.createElement("tr");
        n.classList.add(r ? "row-true" : "row-false");
        for (var a = 0; a < t.length; a++) {
            var o = document.createElement("td");
            o.innerHTML = t[a] ? "T" : "F",
            n.appendChild(o)
        }
        var i = document.createElement("td");
        i.innerHTML = r ? "T" : "F",
        n.appendChild(i),
        e.appendChild(n)
    }
}
function displayTable(e) {
    var t = document.createElement("div");
    t.className = "truth-table-holder",
    t.appendChild(e),
    showObject(t)
}
function showObject(e) {
    for (var t = document.getElementById("table-target"); 0 !== t.children.length; )
        t.removeChild(t.children[0]);
    t.appendChild(e)
}
function displayCompileError(e, t) {
    var r = document.createElement("div");
    r.appendChild(createHighlightedErrorBox(e, t)),
    r.appendChild(createDescriptionBox(t)),
    showObject(r)
}
function createHighlightedErrorBox(e, t) {
    var r = document.createElement("div");
    r.className = "syntax-error-holder";
    var n = document.createElement("span");
    n.className = "syntax-okay",
    n.textContent = e.substring(0, t.start);
    var a = document.createElement("span");
    a.className = "syntax-error",
    a.textContent = e.substring(t.start, t.end);
    var o = document.createElement("span");
    return o.className = "syntax-okay",
    o.textContent = e.substring(t.end),
    r.appendChild(n),
    r.appendChild(a),
    r.appendChild(o),
    r
}
function createDescriptionBox(e) {
    var t = document.createElement("div");
    return t.className = "syntax-error-explanation",
    t.textContent = e.description,
    t
}
function scan(e) {
    return checkIntegrity(e),
    numberVariables(preliminaryScan(e))
}
function preliminaryScan(e) {
    e += kScannerConstants.EOF;
    for (var t = 0, r = {}, n = []; ; ) {
        var a = e.charAt(t);
        if (a === kScannerConstants.EOF)
            return n.push(makeIdentityToken(a, t)),
            {
                tokens: n,
                variableSet: r
            };
        if (isVariableStart(e, t)) {
            var o = scanVariable(e, t, r);
            n.push(makeVariableToken(o, t, t + o.length)),
            t += o.length
        } else if (isOperatorStart(e, t)) {
            var i = tryReadOperator(e, t);
            n.push(makeIdentityToken(i, t)),
            t += i.length
        } else
            isWhitespace(e.charAt(t)) ? t++ : scannerFail("The character " + e.charAt(t) + " shouldn't be here.", t, t + 1)
    }
}
function makeIdentityToken(e, t) {
    return {
        type: translate(e),
        start: t,
        end: t + e.length
    }
}
function makeVariableToken(e, t, r) {
    return {
        type: "variable",
        index: e,
        start: t,
        end: r
    }
}
function isVariableStart(e, t) {
    return null !== tryReadVariableName(e, t)
}
function tryReadVariableName(e, t) {
    if (!/[A-Za-z_]/.test(e.charAt(t)))
        return null;
    for (var r = ""; /[A-Za-z_0-9]/.test(e.charAt(t)); )
        r += e.charAt(t),
        t++;
    return isReservedWord(r) ? null : r
}
function isReservedWord(e) {
    return "T" === e || "F" === e || "and" === e || "or" === e || "not" === e || "iff" === e || "implies" === e || "true" === e || "false" === e
}
function scanVariable(e, t, r) {
    var n = tryReadVariableName(e, t);
    return r[n] = !0,
    n
}
function isOperatorStart(e, t) {
    return null !== tryReadOperator(e, t)
}
function tryReadOperator(e, t) {
    if (t < e.length - 14) {
        var r = e.substring(t, t + 15);
        if ("\\leftrightarrow" === r || "\\Leftrightarrow" === r)
            return r
    }
    if (t < e.length - 10) {
        var n = e.substring(t, t + 11);
        if ("\\rightarrow" === n || "\\Rightarrow" === n)
            return n
    }
    if (t < e.length - 6) {
        var a = e.substring(t, t + 7);
        if ("implies" === a)
            return a
    }
    if (t < e.length - 5) {
        var o = e.substring(t, t + 6);
        if ("\\wedge" === o)
            return o
    }
    if (t < e.length - 4) {
        var i = e.substring(t, t + 5);
        if ("false" === i || "\\lnot" === i || "\\lneg" === i || "\\land" === i)
            return i
    }
    if (t < e.length - 3) {
        var s = e.substring(t, t + 4);
        if ("true" === s || "\\top" === s || "\\bot" === s || "\\lor" === s || "\\vee" === s || "\\neg" === s)
            return s
    }
    if (t < e.length - 2) {
        var p = e.substring(t, t + 3);
        if ("<->" === p || "and" === p || "<=>" === p || "not" === p || "iff" === p || "\\to" === p)
            return p
    }
    if (t < e.length - 1) {
        var l = e.substring(t, t + 2);
        if ("/\\" === l || "\\/" === l || "->" === l || "&&" === l || "||" === l || "or" === l || "=>" === l)
            return l
    }
    return /[()~TF^!\u2227\u2228\u2192\u2194\u22A4\u22A5\u00AC]/.test(e.charAt(t)) ? e.charAt(t) : null
}
function translate(e) {
    return "&&" === e || "and" === e || "∧" === e || "\\land" === e || "\\wedge" === e || "^" === e ? "/\\" : "||" === e || "or" === e || "∨" === e || "\\lor" === e || "\\vee" === e ? "\\/" : "=>" === e || "→" === e || "implies" === e || "\\to" === e || "\\rightarrow" === e || "\\Rightarrow" === e ? "->" : "<=>" === e || "↔" === e || "iff" === e || "\\leftrightarrow" === e || "\\Leftrightarrow" === e ? "<->" : "not" === e || "!" === e || "\xac" === e || "\\lnot" === e || "\\neg" === e ? "~" : "⊤" === e || "true" === e || "\\top" === e ? "T" : "⊥" === e || "false" === e || "\\bot" === e ? "F" : e
}
function isWhitespace(e) {
    return /\s/.test(e)
}
function scannerFail(e, t, r) {
    throw {
        description: e,
        start: t,
        end: r
    }
}
function checkIntegrity(e) {
    for (var t = /[A-Za-z_0-9\\\/<>\-~^()\s\&\|\=\!\u2227\u2228\u2192\u2194\u22A4\u22A5\u00AC]/, r = 0; r < e.length; r++)
        t.test(e.charAt(r)) || scannerFail("Illegal character", r, r + 1)
}
function numberVariables(e) {
    var t = [];
    for (var r in e.variableSet)
        t.push(r);
    t.sort();
    for (var n = 0; n < t.length; n++)
        e.variableSet[t[n]] = n;
    for (var a = 0; a < e.tokens.length; a++)
        "variable" === e.tokens[a].type && (e.tokens[a].index = e.variableSet[e.tokens[a].index]);
    return {
        tokens: e.tokens,
        variables: t
    }
}
function generateTruthTable(e, t) {
    for (var r = [], n = 0; n < e.variables.length; n++)
        r.push(!1);
    do
        t(r, e.ast.evaluate(r));
    while (nextAssignment(r))
}
function nextAssignment(e) {
    for (var t = e.length - 1; t >= 0 && e[t]; )
        t--;
    if (-1 == t)
        return !1;
    e[t] = !0;
    for (var r = t + 1; r < e.length; r++)
        e[r] = !1;
    return !0
}
trueNode.prototype.evaluate = function(e) {
    return !0
}
,
trueNode.prototype.toString = function(e) {
    return "&#8868;"
}
,
falseNode.prototype.evaluate = function(e) {
    return !1
}
,
falseNode.prototype.toString = function(e) {
    return "&#8869;"
}
,
negateNode.prototype.evaluate = function(e) {
    return !this.underlying.evaluate(e)
}
,
negateNode.prototype.toString = function(e) {
    return "&not;" + this.underlying.toString(e)
}
,
andNode.prototype.evaluate = function(e) {
    return this.lhs.evaluate(e) && this.rhs.evaluate(e)
}
,
andNode.prototype.toString = function(e) {
    return "(" + this.lhs.toString(e) + " &and; " + this.rhs.toString(e) + ")"
}
,
orNode.prototype.evaluate = function(e) {
    return this.lhs.evaluate(e) || this.rhs.evaluate(e)
}
,
orNode.prototype.toString = function(e) {
    return "(" + this.lhs.toString(e) + " &or; " + this.rhs.toString(e) + ")"
}
,
impliesNode.prototype.evaluate = function(e) {
    return !this.lhs.evaluate(e) || this.rhs.evaluate(e)
}
,
impliesNode.prototype.toString = function(e) {
    return "(" + this.lhs.toString(e) + " &rarr; " + this.rhs.toString(e) + ")"
}
,
iffNode.prototype.evaluate = function(e) {
    return this.lhs.evaluate(e) === this.rhs.evaluate(e)
}
,
iffNode.prototype.toString = function(e) {
    return "(" + this.lhs.toString(e) + " &harr; " + this.rhs.toString(e) + ")"
}
,
variableNode.prototype.evaluate = function(e) {
    return e[this.index]
}
,
variableNode.prototype.toString = function(e) {
    return e[this.index]
}
,
kScannerConstants = {
    EOF: "$"
};
