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
 * @file lib/encoder.ts
 * @author Robert McLeod <@robertdavid010>
 * @author Fabian Vogelsteller <fabian@lukso.network>
 * @author Hugo Masclet <@Hugoo>
 * @author Callum Grindle <@CallumGrindle>
 * @author Jean Cavallera <@CJ42>
 * @date 2023
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.valueContentEncodingMap = exports.decodeDataSourceWithHash = exports.encodeDataSourceWithHash = void 0;
exports.encodeValueType = encodeValueType;
exports.decodeValueType = decodeValueType;
exports.encodeValueContent = encodeValueContent;
exports.decodeValueContent = decodeValueContent;
/*
  this handles encoding and decoding as per necessary for the erc725 schema specifications
*/
const web3_eth_abi_1 = require("web3-eth-abi");
const web3_utils_1 = require("web3-utils");
const web3_validator_1 = require("web3-validator");
const web3_eth_accounts_1 = require("web3-eth-accounts");
const constants_1 = require("../constants/constants");
const utils_1 = require("./utils");
const uintNValueTypeRegex = /^uint(\d+)$/;
const bytesNValueTypeRegex = /^bytes(\d+)$/;
const BytesNValueContentRegex = /Bytes(\d+)/;
const encodeDataSourceWithHash = (verification, dataSource) => {
    const verificationMethod = (0, utils_1.getVerificationMethod)((verification === null || verification === void 0 ? void 0 : verification.method) || constants_1.NONE_VERIFICATION_METHOD);
    return [
        '0x0000',
        (0, web3_eth_accounts_1.stripHexPrefix)(verificationMethod
            ? (0, web3_utils_1.padLeft)((0, web3_utils_1.keccak256)(verificationMethod.name).slice(0, 10), 8)
            : '00000000'),
        (0, web3_eth_accounts_1.stripHexPrefix)((verification === null || verification === void 0 ? void 0 : verification.data)
            ? (0, web3_utils_1.padLeft)(verification.data.slice(2).length / 2, 4)
            : '0000'),
        (0, web3_eth_accounts_1.stripHexPrefix)((verification === null || verification === void 0 ? void 0 : verification.data) ? (0, web3_eth_accounts_1.stripHexPrefix)(verification === null || verification === void 0 ? void 0 : verification.data) : ''),
        (0, web3_eth_accounts_1.stripHexPrefix)((0, web3_utils_1.utf8ToHex)(dataSource)),
    ].join('');
};
exports.encodeDataSourceWithHash = encodeDataSourceWithHash;
const decodeDataSourceWithHash = (value) => {
    if (value.slice(0, 6) === '0x0000') {
        // DEAL with VerifiableURI
        // NOTE: A JSONURL with a 0x00000000 verification method is invalid.
        /*
          0        1         2         3         4         5         6         7         8
          12345678901234567890123456789012345678901234567890123456789012345678901234567890
          0x0000 code
                6f357c6a hash fn [6]
                        0020 data len [14]
                            820464ddfac1be...[18 + data len]
                                                           [18 + data len]...696670733a2f2...[...rest]
        */
        const verificationMethodSignature = `0x${value.slice(6, 14)}`;
        // NOTE: verificationMethodSignature can be 0x00000000 if no verification method is used
        // this means that an invalid verification method should still return all data
        // and not be an error. It's up to the method calling this to figure out
        // whether an unknown verification method is an error or not.
        const verificationMethod = (0, utils_1.getVerificationMethod)(verificationMethodSignature);
        const encodedLength = `0x${value.slice(14, 18)}`; // Rest of data string after function hash
        const dataLength = (0, web3_utils_1.hexToNumber)(encodedLength);
        const dataHash = `0x${value.slice(18, 18 + dataLength * 2)}`; // Get jsonHash 32 bytes
        const dataSource = (0, web3_utils_1.hexToUtf8)(`0x${value.slice(18 + dataLength * 2)}`); // Get remainder as URI
        return {
            verification: {
                method: (verificationMethod === null || verificationMethod === void 0 ? void 0 : verificationMethod.name) || verificationMethodSignature,
                data: dataHash,
            },
            url: dataSource,
        };
    }
    // @Deprecated code here:
    // Eventually we should no longer have JSONURL, AssetURL or (bytes4,URI)
    // DEAL with JSONURL
    const verificationMethodSignature = value.slice(0, 10);
    const verificationMethod = (0, utils_1.getVerificationMethod)(verificationMethodSignature);
    const encodedData = value.slice(10); // Rest of data string after function hash
    try {
        // Special case where JSONURL is really (bytes4,URI) as specified
        // by the old version of LSP8TokenMetadataBaseURI
        // Catch error in case the buffor is not convertable to utf8.
        const dataSource = (0, web3_utils_1.hexToUtf8)(`0x${encodedData}`); // Get as URI
        if (encodedData.length < 64 || /^[a-z]{2,}:[/\S]/.test(dataSource)) {
            // If the verification data starts with a utf8 sequence that looks like https:/ or data: or ar:/ for example.
            return {
                verification: {
                    method: constants_1.NONE_VERIFICATION_METHOD,
                    data: '0x',
                },
                url: dataSource,
            };
        }
    }
    catch (_a) {
        // ignore
    }
    const dataHash = `0x${encodedData.slice(0, 64)}`; // Get jsonHash 32 bytes
    const dataSource = (0, web3_utils_1.hexToUtf8)(`0x${encodedData.slice(64)}`); // Get remainder as URI
    return {
        verification: {
            method: (verificationMethod === null || verificationMethod === void 0 ? void 0 : verificationMethod.name) || verificationMethodSignature,
            data: dataHash,
        },
        url: dataSource,
    };
};
exports.decodeDataSourceWithHash = decodeDataSourceWithHash;
const encodeToBytesN = (bytesN, value) => {
    const numberOfBytesInType = Number.parseInt(bytesN.split('bytes')[1], 10);
    let valueToEncode;
    if (typeof value === 'string' && !(0, web3_validator_1.isHex)(value)) {
        // if we receive a plain string (e.g: "hey!"), convert it to utf8-hex data
        valueToEncode = (0, web3_utils_1.toHex)(value);
    }
    else if (typeof value === 'number') {
        // if we receive a number as input, convert it to hex,
        // despite `bytesN` pads on the right, we pad number on the left side here
        // to symmetrically encode / decode
        valueToEncode = (0, web3_utils_1.padLeft)((0, web3_utils_1.numberToHex)(value), numberOfBytesInType * 2);
    }
    else {
        valueToEncode = value;
    }
    const numberOfBytesInValue = (0, utils_1.countNumberOfBytes)(valueToEncode);
    if (numberOfBytesInValue > numberOfBytesInType) {
        throw new Error(`Can't convert ${value} to ${bytesN}. Too many bytes, expected at most ${numberOfBytesInType} bytes, received ${numberOfBytesInValue}.`);
    }
    const abiEncodedValue = (0, web3_eth_abi_1.encodeParameter)(bytesN, valueToEncode);
    // abi-encoding right pads to 32 bytes, if we need less, we need to remove the padding
    if (numberOfBytesInType === 32) {
        return abiEncodedValue;
    }
    const bytesArray = (0, web3_utils_1.hexToBytes)(abiEncodedValue);
    return (0, web3_utils_1.bytesToHex)(bytesArray.slice(0, numberOfBytesInType));
};
/**
 * Encodes bytes to CompactBytesArray
 *
 * @param values An array of BytesLike strings
 * @returns bytes[CompactBytesArray]
 */
const encodeCompactBytesArray = (values) => {
    const compactBytesArray = values
        .filter((value, index) => {
        if (value === '') {
            return '0x';
        }
        if (!(0, web3_validator_1.isHex)(value)) {
            throw new Error(`Couldn't encode bytes[CompactBytesArray], value at index ${index} is not hex`);
        }
        if (value.length > 65535 * 2 + 2) {
            throw new Error(`Couldn't encode bytes[CompactBytesArray], value at index ${index} exceeds 65_535 bytes`);
        }
        return true;
    })
        .reduce((acc, value) => {
        const numberOfBytes = (0, web3_eth_accounts_1.stripHexPrefix)(value).length / 2;
        const hexNumber = (0, web3_utils_1.padLeft)((0, web3_utils_1.numberToHex)(numberOfBytes), 4);
        return acc + (0, web3_eth_accounts_1.stripHexPrefix)(hexNumber) + (0, web3_eth_accounts_1.stripHexPrefix)(value);
    }, '0x');
    return compactBytesArray;
};
/**
 * Decodes CompactBytesArray of type bytes
 *
 * @param compactBytesArray A bytes[CompactBytesArray]
 * @returns An array of BytesLike strings decode from `compactBytesArray`
 */
const decodeCompactBytesArray = (compactBytesArray) => {
    if (!(0, web3_validator_1.isHex)(compactBytesArray))
        throw new Error("Couldn't decode, value is not hex");
    let pointer = 0;
    const encodedValues = [];
    const strippedCompactBytesArray = (0, web3_eth_accounts_1.stripHexPrefix)(compactBytesArray);
    while (pointer < strippedCompactBytesArray.length) {
        const length = Number((0, web3_utils_1.hexToNumber)(`0x${strippedCompactBytesArray.slice(pointer, pointer + 4)}`));
        if (length === 0) {
            // empty entries (`0x0000`) in a CompactBytesArray are returned as empty entries in the array
            encodedValues.push('');
        }
        else {
            encodedValues.push(`0x${strippedCompactBytesArray.slice(pointer + 4, pointer + 2 * (length + 2))}`);
        }
        pointer += 2 * (length + 2);
    }
    if (pointer > strippedCompactBytesArray.length)
        throw new Error("Couldn't decode bytes[CompactBytesArray]");
    return encodedValues;
};
/**
 * Encodes bytesN to CompactBytesArray
 *
 * @param values An array of BytesLike strings
 * @param numberOfBytes The number of bytes for each value from `values`
 * @returns bytesN[CompactBytesArray]
 */
const encodeBytesNCompactBytesArray = (values, numberOfBytes) => {
    values.forEach((value, index) => {
        if ((0, web3_eth_accounts_1.stripHexPrefix)(value).length > numberOfBytes * 2)
            throw new Error(`Hex bytes${numberOfBytes} value at index ${index} does not fit in ${numberOfBytes} bytes`);
    });
    return encodeCompactBytesArray(values);
};
/**
 * Decodes CompactBytesArray of type bytesN
 *
 * @param compactBytesArray A bytesN[CompactBytesArray]
 * @param numberOfBytes The number of bytes allowed per each element from `compactBytesArray`
 * @returns An array of BytesLike strings decoded from `compactBytesArray`
 */
const decodeBytesNCompactBytesArray = (compactBytesArray, numberOfBytes) => {
    const bytesValues = decodeCompactBytesArray(compactBytesArray);
    bytesValues.forEach((bytesValue, index) => {
        if ((0, web3_eth_accounts_1.stripHexPrefix)(bytesValue).length > numberOfBytes * 2)
            throw new Error(`Hex bytes${numberOfBytes} value at index ${index} does not fit in ${numberOfBytes} bytes`);
    });
    return bytesValues;
};
/**
 * @returns Encoding/decoding for bytes1[CompactBytesArray] to bytes32[COmpactBytesArray]
 */
const returnTypesOfBytesNCompactBytesArray = () => {
    const types = {};
    for (let i = 1; i < 33; i++) {
        types[`bytes${i}[CompactBytesArray]`] = {
            encode: (value) => encodeBytesNCompactBytesArray(value, i),
            decode: (value) => decodeBytesNCompactBytesArray(value, i),
        };
    }
    return types;
};
/**
 * Encodes uintN to CompactBytesArray
 * @param values An array of BytesLike strings
 * @param numberOfBytes The number of bytes for each value from `values`
 * @returns uintN[CompactBytesArray]
 */
const encodeUintNCompactBytesArray = (values, numberOfBytes) => {
    const hexValues = values.map((value, index) => {
        const hexNumber = (0, web3_eth_accounts_1.stripHexPrefix)((0, web3_utils_1.numberToHex)(value)).padStart(numberOfBytes * 2, '0');
        if (hexNumber.length > numberOfBytes * 2)
            throw new Error(`Hex uint${numberOfBytes * 8} value at index ${index} does not fit in ${numberOfBytes} bytes`);
        return hexNumber;
    });
    return encodeCompactBytesArray(hexValues);
};
/**
 * Decodes CompactBytesArray of type uintN
 * @param compactBytesArray A uintN[CompactBytesArray]
 * @param numberOfBytes The number of bytes allowed per each element from `compactBytesArray`
 * @returns An array of numbers decoded from `compactBytesArray`
 */
const decodeUintNCompactBytesArray = (compactBytesArray, numberOfBytes) => {
    const hexValues = decodeCompactBytesArray(compactBytesArray);
    return hexValues.map((hexValue, index) => {
        const hexValueStripped = (0, web3_eth_accounts_1.stripHexPrefix)(hexValue);
        if (hexValueStripped.length > numberOfBytes * 2)
            throw new Error(`Hex uint${numberOfBytes * 8} value at index ${index} does not fit in ${numberOfBytes} bytes`);
        return (0, web3_utils_1.toNumber)(hexValue);
    });
};
/**
 * @returns Encoding/decoding for uint8[CompactBytesArray] to uint256[COmpactBytesArray]
 */
const returnTypesOfUintNCompactBytesArray = () => {
    const types = {};
    for (let i = 1; i < 33; i++) {
        types[`uint${i * 8}[CompactBytesArray]`] = {
            encode: (value) => encodeUintNCompactBytesArray(value, i),
            decode: (value) => decodeUintNCompactBytesArray(value, i),
        };
    }
    return types;
};
/**
 * Encodes any set of strings to string[CompactBytesArray]
 *
 * @param values An array of non restricted strings
 * @returns string[CompactBytesArray]
 */
const encodeStringCompactBytesArray = (values) => {
    const hexValues = values.map((element) => (0, web3_utils_1.utf8ToHex)(element));
    return encodeCompactBytesArray(hexValues);
};
/**
 * Decode a string[CompactBytesArray] to an array of strings
 * @param compactBytesArray A string[CompactBytesArray]
 * @returns An array of strings
 */
const decodeStringCompactBytesArray = (compactBytesArray) => {
    const hexValues = decodeCompactBytesArray(compactBytesArray);
    const stringValues = hexValues.map((element) => (0, web3_utils_1.hexToUtf8)(element));
    return stringValues;
};
const valueTypeEncodingMap = (type) => {
    const uintNRegexMatch = type.match(uintNValueTypeRegex);
    const bytesNRegexMatch = type.match(bytesNValueTypeRegex);
    const bytesLength = bytesNRegexMatch
        ? Number.parseInt(bytesNRegexMatch[1], 10)
        : '';
    const uintLength = uintNRegexMatch
        ? Number.parseInt(uintNRegexMatch[0].slice(4), 10)
        : '';
    if (type.includes('[CompactBytesArray]')) {
        const compactBytesArrayMap = Object.assign(Object.assign({ 'bytes[CompactBytesArray]': {
                encode: (value) => encodeCompactBytesArray(value),
                decode: (value) => decodeCompactBytesArray(value),
            }, 'string[CompactBytesArray]': {
                encode: (value) => encodeStringCompactBytesArray(value),
                decode: (value) => decodeStringCompactBytesArray(value),
            } }, returnTypesOfBytesNCompactBytesArray()), returnTypesOfUintNCompactBytesArray());
        return compactBytesArrayMap[type];
    }
    if (type === 'bytes') {
        return {
            encode: (value) => (0, web3_utils_1.toHex)(value),
            decode: (value) => value,
        };
    }
    switch (type) {
        case 'bool':
        case 'boolean':
            return {
                encode: (value) => (value ? '0x01' : '0x00'),
                decode: (value) => value === '0x01',
            };
        case 'string':
            return {
                encode: (value) => {
                    // if we receive a number as input, convert each letter to its utf8 hex representation
                    if (typeof value === 'number') {
                        return (0, web3_utils_1.utf8ToHex)(`${value}`);
                    }
                    return (0, web3_utils_1.utf8ToHex)(value);
                },
                decode: (value) => (0, web3_utils_1.hexToUtf8)(value),
            };
        case 'address':
            return {
                encode: (value) => {
                    // abi-encode pads to 32 x 00 bytes on the left, so we need to remove them
                    const abiEncodedValue = (0, web3_eth_abi_1.encodeParameter)('address', value);
                    // convert to an array of individual bytes
                    const bytesArray = (0, web3_utils_1.hexToBytes)(abiEncodedValue);
                    // just keep the last 20 bytes, starting at index 12
                    return (0, web3_utils_1.bytesToHex)(bytesArray.slice(12));
                },
                decode: (value) => (0, web3_utils_1.toChecksumAddress)(value),
            };
        // NOTE: We could add conditional handling of numeric values here...
        case `uint${uintLength}`:
            return {
                encode: (value) => {
                    if (!(0, utils_1.isValidUintSize)(uintLength)) {
                        throw new Error(`Can't encode ${value} as ${type}. Invalid \`uintN\` provided. Expected a multiple of 8 bits between 8 and 256.`);
                    }
                    const abiEncodedValue = (0, web3_eth_abi_1.encodeParameter)(type, value);
                    const numberOfBits = (0, utils_1.countSignificantBits)(abiEncodedValue);
                    if (numberOfBits > uintLength) {
                        throw new Error(`Can't represent value ${value} as ${type}. To many bits required ${numberOfBits} > ${uintLength}`);
                    }
                    const bytesArray = (0, web3_utils_1.hexToBytes)(abiEncodedValue);
                    const numberOfBytes = uintLength / 8;
                    // abi-encoding always pad to 32 bytes. We need to keep the `n` rightmost bytes.
                    // where `n` = `numberOfBytes`
                    const startIndex = 32 - numberOfBytes;
                    return (0, web3_utils_1.bytesToHex)(bytesArray.slice(startIndex));
                },
                decode: (value) => {
                    if (!(0, web3_validator_1.isHex)(value)) {
                        throw new Error(`Can't convert ${value} to ${type}, value is not hex.`);
                    }
                    if (!(0, utils_1.isValidUintSize)(uintLength)) {
                        throw new Error(`Can't decode ${value} as ${type}. Invalid \`uintN\` provided. Expected a multiple of 8 bits between 8 and 256.`);
                    }
                    const numberOfBits = (0, utils_1.countSignificantBits)(value);
                    if (numberOfBits > uintLength) {
                        throw new Error(`Can't represent value ${value} as ${type}. To many bits required ${numberOfBits} > ${uintLength}`);
                    }
                    const numberOfBytes = (0, utils_1.countNumberOfBytes)(value);
                    if (numberOfBytes > uintLength / 8) {
                        console.debug(`Value ${value} for ${type} is too long but value contains only ${numberOfBits}. Too many bytes. ${numberOfBytes} > 16`);
                    }
                    return (0, web3_utils_1.toNumber)(value);
                },
            };
        case `bytes${bytesLength}`:
            return {
                encode: (value) => {
                    if (!(0, utils_1.isValidByteSize)(bytesLength)) {
                        throw new Error(`Can't encode ${value} as ${type}. Invalid \`bytesN\` provided. Expected a \`N\` value for bytesN between 1 and 32.`);
                    }
                    return encodeToBytesN(type, value);
                },
                decode: (value) => {
                    // we need to abi-encode the value again to ensure that:
                    //  - that data to decode does not go over N bytes.
                    //  - if the data is less than N bytes, that it gets padded to N bytes long.
                    const reEncodedData = (0, web3_eth_abi_1.encodeParameter)(type, value);
                    return (0, web3_eth_abi_1.decodeParameter)(type, reEncodedData);
                },
            };
        case 'bool[]':
            return {
                encode: (value) => (0, web3_eth_abi_1.encodeParameter)('bool[]', value),
                decode: (value) => (0, web3_eth_abi_1.decodeParameter)('bool[]', value),
            };
        case 'boolean[]':
            return {
                encode: (value) => (0, web3_eth_abi_1.encodeParameter)('bool[]', value),
                decode: (value) => (0, web3_eth_abi_1.decodeParameter)('bool[]', value),
            };
        case 'string[]':
            return {
                encode: (value) => (0, web3_eth_abi_1.encodeParameter)('string[]', value),
                decode: (value) => (0, web3_eth_abi_1.decodeParameter)('string[]', value),
            };
        case 'address[]':
            return {
                encode: (value) => (0, web3_eth_abi_1.encodeParameter)('address[]', value),
                decode: (value) => (0, web3_eth_abi_1.decodeParameter)('address[]', value),
            };
        case 'uint256[]':
            return {
                encode: (value) => (0, web3_eth_abi_1.encodeParameter)('uint256[]', value),
                decode: (value) => {
                    // we want to return an array of numbers as [1, 2, 3], not an array of strings as [ '1', '2', '3']
                    return (0, web3_eth_abi_1.decodeParameter)('uint256[]', value).map((numberAsString) => Number.parseInt(numberAsString, 10));
                },
            };
        case 'bytes32[]':
            return {
                encode: (value) => (0, web3_eth_abi_1.encodeParameter)('bytes32[]', value),
                decode: (value) => (0, web3_eth_abi_1.decodeParameter)('bytes32[]', value),
            };
        case 'bytes4[]':
            return {
                encode: (value) => (0, web3_eth_abi_1.encodeParameter)('bytes4[]', value),
                decode: (value) => (0, web3_eth_abi_1.decodeParameter)('bytes4[]', value),
            };
        case 'bytes[]':
            return {
                encode: (value) => (0, web3_eth_abi_1.encodeParameter)('bytes[]', value),
                decode: (value) => (0, web3_eth_abi_1.decodeParameter)('bytes[]', value),
            };
        case 'bytes[CompactBytesArray]':
            return {
                encode: (value) => encodeCompactBytesArray(value),
                decode: (value) => decodeCompactBytesArray(value),
            };
        case 'string[CompactBytesArray]':
            return {
                encode: (value) => encodeStringCompactBytesArray(value),
                decode: (value) => decodeStringCompactBytesArray(value),
            };
        default:
            return {
                encode: (value) => {
                    throw new Error(`Could not encode ${value}. Value type ${type} is unknown`);
                },
                decode: (value) => {
                    throw new Error(`Could not decode ${value}. Value type ${type} is unknown`);
                },
            };
    }
};
// Use enum for type below
// Is it this enum ERC725JSONSchemaValueType? (If so, custom is missing from enum)
const valueContentEncodingMap = (valueContent) => {
    const bytesNRegexMatch = valueContent.match(BytesNValueContentRegex);
    const bytesLength = bytesNRegexMatch
        ? Number.parseInt(bytesNRegexMatch[1], 10)
        : '';
    switch (valueContent) {
        case 'Keccak256': {
            return {
                type: 'bytes32',
                encode: (value) => value,
                decode: (value) => value,
            };
        }
        case 'Number': {
            return {
                type: 'uint256',
                encode: (value) => {
                    let parsedValue;
                    try {
                        parsedValue = Number.parseInt(value, 10);
                    }
                    catch (error) {
                        throw new Error(error);
                    }
                    return (0, web3_utils_1.padLeft)((0, web3_utils_1.numberToHex)(parsedValue), 64);
                },
                decode: (value) => (0, web3_utils_1.toNumber)(value),
            };
        }
        // NOTE: This is not symmetrical, and always returns a checksummed address
        case 'Address': {
            return {
                type: 'address',
                encode: (value) => {
                    if ((0, web3_validator_1.isAddress)(value)) {
                        return value.toLowerCase();
                    }
                    throw new Error(`Address: "${value}" is an invalid address.`);
                },
                decode: (value) => (0, web3_utils_1.toChecksumAddress)(value),
            };
        }
        case 'String': {
            return {
                type: 'string',
                encode: (value) => (0, web3_utils_1.utf8ToHex)(value),
                decode: (value) => (0, web3_utils_1.hexToUtf8)(value),
            };
        }
        case 'Markdown': {
            return {
                type: 'string',
                encode: (value) => (0, web3_utils_1.utf8ToHex)(value),
                decode: (value) => (0, web3_utils_1.hexToUtf8)(value),
            };
        }
        case 'URL': {
            return {
                type: 'string',
                encode: (value) => (0, web3_utils_1.utf8ToHex)(value),
                decode: (value) => (0, web3_utils_1.hexToUtf8)(value),
            };
        }
        // https://github.com/lukso-network/LIPs/blob/main/LSPs/LSP-2-ERC725YJSONSchema.md#verifiableuri
        case 'AssetURL': // Deprecated since v0.22.0
        case 'JSONURL': // Deprecated since v0.22.0
        case 'VerifiableURI': {
            return {
                type: 'custom',
                encode: (dataToEncode) => {
                    const { verification: { data, method } = {}, json, url, } = dataToEncode;
                    let hashedJson = data;
                    if (json) {
                        if (method) {
                            throw new Error('When passing in the `json` property, we use "keccak256(utf8)" as a default verification method. You do not need to set a `verification.method`.');
                        }
                        hashedJson = (0, utils_1.hashData)(json, constants_1.SUPPORTED_VERIFICATION_METHOD_STRINGS.KECCAK256_UTF8);
                    }
                    if (!hashedJson) {
                        throw new Error('You have to provide either the verification.data or the json via the respective properties');
                    }
                    return (0, exports.encodeDataSourceWithHash)({
                        method: method ||
                            constants_1.SUPPORTED_VERIFICATION_METHOD_STRINGS.KECCAK256_UTF8,
                        data: hashedJson || '0x',
                    }, url);
                },
                decode: (dataToDecode) => (0, exports.decodeDataSourceWithHash)(dataToDecode),
            };
        }
        case `Bytes${bytesLength}`: {
            return {
                type: 'bytes',
                encode: (value) => {
                    if (typeof value !== 'string' || !(0, web3_validator_1.isHex)(value)) {
                        throw new Error(`Value: ${value} is not hex.`);
                    }
                    if (bytesLength && !(0, utils_1.isValidByteSize)(bytesLength)) {
                        throw new Error(`Provided bytes length: ${bytesLength} for encoding valueContent: ${valueContent} is not valid.`);
                    }
                    if (bytesLength && value.length !== 2 + bytesLength * 2) {
                        throw new Error(`Value: ${value} is not of type ${valueContent}. Expected hex value of length ${2 + bytesLength * 2}`);
                    }
                    return value;
                },
                decode: (value) => {
                    if (typeof value !== 'string' || !(0, web3_validator_1.isHex)(value)) {
                        console.error(`Value: ${value} is not hex.`);
                        return null;
                    }
                    if (bytesLength && !(0, utils_1.isValidByteSize)(bytesLength)) {
                        console.error(`Provided bytes length: ${bytesLength} for encoding valueContent: ${valueContent} is not valid.`);
                        return null;
                    }
                    if (bytesLength && value.length !== 2 + bytesLength * 2) {
                        console.error(`Value: ${value} is not of type ${valueContent}. Expected hex value of length ${2 + bytesLength * 2}`);
                        return null;
                    }
                    return value;
                },
            };
        }
        case 'BitArray': {
            return {
                type: 'bytes',
                encode: (value) => {
                    if (typeof value !== 'string' || !(0, web3_validator_1.isHex)(value)) {
                        throw new Error(`Value: ${value} is not hex.`);
                    }
                    return value;
                },
                decode: (value) => {
                    if (typeof value !== 'string' || !(0, web3_validator_1.isHex)(value)) {
                        console.error(`Value: ${value} is not hex.`);
                        return null;
                    }
                    return value;
                },
            };
        }
        case 'Boolean': {
            return {
                type: 'bool',
                encode: (value) => {
                    return valueTypeEncodingMap('bool').encode(value);
                },
                decode: (value) => {
                    try {
                        return valueTypeEncodingMap('bool').decode(value);
                    }
                    catch (error) {
                        throw new Error(`Value ${value} is not a boolean`);
                    }
                },
            };
        }
        default: {
            return {
                type: 'unknown',
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                encode: (_value) => {
                    throw new Error(`Could not encode unknown (${valueContent}) valueContent.`);
                },
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                decode: (_value) => {
                    throw new Error(`Could not decode unknown (${valueContent}) valueContent.`);
                },
            };
        }
    }
};
exports.valueContentEncodingMap = valueContentEncodingMap;
function encodeValueType(type, // for tuples and CompactBytesArray,
value) {
    if (typeof value === 'undefined' || value === null) {
        return value;
    }
    return valueTypeEncodingMap(type).encode(value);
}
function decodeValueType(type, // for tuples and CompactBytesArray
data) {
    if (data === '0x')
        return null;
    if (typeof data === 'undefined' || data === null) {
        return data;
    }
    return valueTypeEncodingMap(type).decode(data);
}
function encodeValueContent(valueContent, value) {
    if ((0, utils_1.isValueContentLiteralHex)(valueContent)) {
        // hex characters are always lower case, even if the schema define some hex words uppercase
        // e.g: 0xAabbcCddeE -> encoded as 0xaabbccddee
        return valueContent === value ? value.toLowerCase() : false;
    }
    const valueContentEncodingMethods = (0, exports.valueContentEncodingMap)(valueContent);
    if (!valueContentEncodingMethods) {
        throw new Error(`Could not encode valueContent: ${valueContent}.`);
    }
    if (value === null || value === undefined) {
        return '0x';
    }
    if ((valueContent === 'AssetURL' ||
        valueContent === 'JSONURL' ||
        valueContent === 'Boolean') &&
        typeof value === 'string') {
        const expectedValueType = valueContent === 'Boolean' ? 'boolean' : 'object';
        throw new Error(`Could not encode valueContent: ${valueContent} with value: ${value}. Expected ${expectedValueType}.`);
    }
    return valueContentEncodingMethods.encode(value);
}
function decodeValueContent(valueContent, value) {
    if ((0, utils_1.isValueContentLiteralHex)(valueContent)) {
        return valueContent.toLowerCase() === value ? valueContent : null;
    }
    if (value == null || value === '0x') {
        // !value allows 0 values to become null.
        return null;
    }
    return (0, exports.valueContentEncodingMap)(valueContent).decode(value);
}
//# sourceMappingURL=encoder.js.map