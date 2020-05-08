/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import * as ts from 'typescript';
import {SignatureHelpItem} from 'typescript/lib/tsserverlibrary';

import {createLanguageService} from '../src/language_service';
import {CompletionKind} from '../src/types';
import {TypeScriptServiceHost} from '../src/typescript_host';

import {MockTypescriptHost} from './test_utils';

const TEST_TEMPLATE = '/app/test.ng';

describe('completions', () => {
  const mockHost = new MockTypescriptHost(['/app/main.ts']);
  const tsLS = ts.createLanguageService(mockHost);
  const ngHost = new TypeScriptServiceHost(mockHost, tsLS);
  const ngLS = createLanguageService(ngHost);

  beforeEach(() => {
    mockHost.reset();
  });

  it('should be able to complete property read', () => {
    mockHost.override(TEST_TEMPLATE, `<h1 [model]="test('a', 1~{property-read})"></h1>`);
    const marker = mockHost.getLocationMarkerFor(TEST_TEMPLATE, 'property-read');
    debugger
    const signatureHelp = ngLS.getSignatureHelp(TEST_TEMPLATE, marker.start);
    if (signatureHelp) {
      const a = toText(signatureHelp.items);
      expect(a).toBe('test(a: string, b: number | undefined): number');
    }
  });
});

function toText(displayParts: SignatureHelpItem[]): string {
  return displayParts
      .map(item => {
        const prefix = item.prefixDisplayParts.map(parts => parts.text).join('');
        const suffix = item.suffixDisplayParts.map(parts => parts.text).join('');
        const separator = item.separatorDisplayParts.map(parts => parts.text).join('');
        const param = item.parameters
                          .map(params => {
                            return params.displayParts.map(parts => parts.text).join('');
                          })
                          .join(separator);
        return prefix + param + suffix
      })
      .join('');
}
