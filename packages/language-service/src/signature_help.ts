import {BoundElementPropertyAst, NullTemplateVisitor} from '@angular/compiler';
import {Signature, SignatureHelpItems} from 'typescript/lib/tsserverlibrary';

import {getExpressionScope} from './expression_diagnostics';
import {getMethodSignature} from './expressions';
import * as ng from './types';
import {diagnosticInfoFromTemplateInfo, findTemplateAstAt} from './utils';

export function getSignatureHelp(templateInfo: ng.AstResult, position: number): SignatureHelpItems|
    undefined {
  const templatePosition = position - templateInfo.template.span.start;

  const path = findTemplateAstAt(templateInfo.templateAst, templatePosition);

  let signatures: ng.Signature[]|undefined;
  class ExpressionVisitor extends NullTemplateVisitor {
    constructor(
        private readonly info: ng.AstResult, private readonly position: number,
        private readonly getExpressionScope: () => ng.SymbolTable) {
      super();
    }
    visitElementProperty(ast: BoundElementPropertyAst) {
      const symbol =
          getMethodSignature(this.getExpressionScope(), ast.value, position, this.info.template);

      signatures = symbol?.signatures();
    }
  }

  const visitor = new ExpressionVisitor(templateInfo, position, () => {
    const dinfo = diagnosticInfoFromTemplateInfo(templateInfo);
    return getExpressionScope(dinfo, path);
  })
  path.tail?.visit(visitor, null);
  if (signatures) {
    return {
      items: signatures.map(p => {
        return {
          isVariadic: true, prefixDisplayParts: [], suffixDisplayParts: [],
              separatorDisplayParts: [], parameters: p.arguments.values().map(_p => {
                return {
                  documentation: [], displayParts: [], isOptional: true, name: _p.name
                }
              }),
              documentation: [], tags: []
        }
      }),
          applicableSpan: null as any, argumentCount: 0, argumentIndex: 0, selectedItemIndex: 0
    }
  }
}