"use strict";
/*
    This file is part of @erc725/erc725.js.
    @erc725/erc725.js is free software: you can redistribute it and/or modify
    it under the terms of the GNU Lesser General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
    @erc725/erc725.js is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Lesser General Public License for more details.
    You should have received a copy of the GNU Lesser General Public License
    along with @erc725/erc725.js.  If not, see <http://www.gnu.org/licenses/>.
*/
/**
 * @file lib/getSchemaElement.ts
 * @author Hugo Masclet <@Hugoo>
 * @date 2021
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSchemaElement = getSchemaElement;
const web3_validator_1 = require("web3-validator");
const encodeKeyName_1 = require("./encodeKeyName");
const decodeMappingKey_1 = require("./decodeMappingKey");
/**
 *
 * @param schemas
 * @param namedDynamicKey
 * @param dynamicKeyParts
 * @returns
 */
const getSchemaElementForDynamicKeyName = (schemas, namedDynamicKey, dynamicKeyParts) => {
    // In that case, we will generate a new schema element with the final computed name and encoded key hash.
    const schemaElement = schemas.find((e) => e.name === namedDynamicKey);
    if (!schemaElement) {
        throw new Error(`No matching schema found for dynamic key: ${namedDynamicKey}`);
    }
    // once we have the schemaElement with dynamic parts, we need to replace the name and the key:
    const key = (0, encodeKeyName_1.encodeKeyName)(namedDynamicKey, dynamicKeyParts);
    const dynamicName = (0, encodeKeyName_1.generateDynamicKeyName)(namedDynamicKey, dynamicKeyParts);
    return Object.assign(Object.assign({}, schemaElement), { dynamicName,
        key,
        dynamicKeyParts });
};
/**
 *
 * @param schemas An array of ERC725JSONSchema objects.
 * @param {string} namedOrHashedKey A string of either the schema element name, or hashed key (with or without the 0x prefix).
 * @param dynamicKeyParts if a dynamic named key is given, you should also set the dynamicKeyParts.
 *
 * @return The requested schema element from the full array of schemas.
 */
function getSchemaElement(schemas, namedOrHashedKey, dynamicKeyParts) {
    let keyHash;
    if (namedOrHashedKey.startsWith('0x')) {
        const index = namedOrHashedKey.indexOf('<');
        if (index !== -1) {
            const partial = namedOrHashedKey.slice(0, index);
            const schemaElement = schemas.find((e) => e.key.slice(0, index) === partial);
            const dynamicKeyParts = (0, decodeMappingKey_1.decodeMappingKey)(namedOrHashedKey, schemaElement);
            if (schemaElement) {
                return Object.assign(Object.assign({}, schemaElement), (dynamicKeyParts ? { dynamicKeyParts } : {}));
            }
        }
    }
    if ((0, encodeKeyName_1.isDynamicKeyName)(namedOrHashedKey)) {
        if (!dynamicKeyParts) {
            throw new Error(`Can't getSchemaElement for dynamic key: ${namedOrHashedKey} without dynamicKeyParts.`);
        }
        return getSchemaElementForDynamicKeyName(schemas, namedOrHashedKey, dynamicKeyParts);
    }
    if ((0, web3_validator_1.isHex)(namedOrHashedKey)) {
        keyHash = (0, web3_validator_1.isHexStrict)(namedOrHashedKey)
            ? namedOrHashedKey
            : `0x${namedOrHashedKey}`;
    }
    else {
        keyHash = (0, encodeKeyName_1.encodeKeyName)(namedOrHashedKey);
    }
    const schemaElement = schemas.find((e) => e.key === keyHash);
    if (!schemaElement) {
        throw new Error(`No matching schema found for key: ${namedOrHashedKey} (${keyHash}).`);
    }
    return schemaElement;
}
//# sourceMappingURL=getSchemaElement.js.map