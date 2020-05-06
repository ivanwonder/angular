import {BoundElementPropertyAst, NullTemplateVisitor,} from '@angular/compiler';
import {createTextSpanFromBounds, Signature, SignatureHelpItem, SignatureHelpItems, SignatureHelpParameter, SymbolDisplayPartKind,} from 'typescript/lib/tsserverlibrary';

import {getExpressionScope} from './expression_diagnostics';
import {getMethodSignature} from './expressions';
import * as ng from './types';
import {diagnosticInfoFromTemplateInfo, findTemplateAstAt, offsetSpan} from './utils';

export function getSignatureHelp(templateInfo: ng.AstResult, position: number): SignatureHelpItems|
    undefined {
  const templatePosition = position - templateInfo.template.span.start;

  const path = findTemplateAstAt(templateInfo.templateAst, templatePosition);

  let symbol: ng.Symbol|undefined;
  let span: ng.Span|undefined;
  class ExpressionVisitor extends NullTemplateVisitor {
    constructor(
        private readonly info: ng.AstResult, private readonly position: number,
        private readonly getExpressionScope: () => ng.SymbolTable) {
      super();
    }
    visitElementProperty(ast: BoundElementPropertyAst) {
      const res =
          getMethodSignature(this.getExpressionScope(), ast.value, position, this.info.template);
      if (res) {
        symbol = res.symbol;
        span = res.span;
      }
    }
  }

  const visitor = new ExpressionVisitor(templateInfo, position, () => {
    const dinfo = diagnosticInfoFromTemplateInfo(templateInfo);
    return getExpressionScope(dinfo, path);
  });
  path.tail?.visit(visitor, null);
  if (symbol && span) {
    return createSignatureHelp(symbol, offsetSpan(span, templateInfo.template.span.start));
  }
}

const SYMBOL_FUNCTION_NAME = SymbolDisplayPartKind[SymbolDisplayPartKind.functionName];
const SYMBOL_PUNC = SymbolDisplayPartKind[SymbolDisplayPartKind.punctuation];
const SYMBOL_SPACE = SymbolDisplayPartKind[SymbolDisplayPartKind.space];
const SYMBOL_KEYWORD = SymbolDisplayPartKind[SymbolDisplayPartKind.keyword];
const SYMBOL_PROPERTY_NAME = SymbolDisplayPartKind[SymbolDisplayPartKind.propertyName];

function createSignatureHelp(symbol: ng.Symbol, span: ng.Span): SignatureHelpItems|undefined {
  const signatures = symbol.signatures();
  const signatureHelpItem: SignatureHelpItem[] = signatures.map((sign) => {
    return {
      isVariadic: false,
      prefixDisplayParts: [
        {text: symbol.name, kind: SYMBOL_FUNCTION_NAME},
        {text: '(', kind: SYMBOL_PUNC},
      ],
      suffixDisplayParts: [
        {text: ')', kind: SYMBOL_PUNC},
        {text: ':', kind: SYMBOL_PUNC},
        {text: ' ', kind: SYMBOL_SPACE},
        {text: sign.result.name, kind: SYMBOL_KEYWORD},
      ],
      separatorDisplayParts: [
        {text: ',', kind: SYMBOL_PUNC},
        {text: ' ', kind: SYMBOL_SPACE},
      ],
      parameters: sign.arguments.values().map((par) => {
        const _par: SignatureHelpParameter = {
          name: par.name,
          documentation: [],
          displayParts: [
            {text: par.name, kind: SYMBOL_PROPERTY_NAME},
            {text: ':', kind: SYMBOL_PUNC},
            {text: ' ', kind: SYMBOL_SPACE},
            {text: par.type!.name, kind: SYMBOL_KEYWORD},
          ],
          isOptional: par.nullable,
        };
        if (_par.isOptional) {
          _par.displayParts.splice(1, 0, {text: '?', kind: SYMBOL_PUNC});
        }
        return _par;
      }),
      documentation: [],
      tags: [],
    };
  });

  return {
    items: signatureHelpItem,
    applicableSpan: createTextSpanFromBounds(span.start, span.end),
    argumentCount: 0,
    argumentIndex: 0,
    selectedItemIndex: 0,
  };
}
