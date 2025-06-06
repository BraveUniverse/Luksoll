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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ERC725 = exports.getSchema = exports.mapPermission = exports.checkPermissions = exports.decodePermissions = exports.encodePermissions = exports.getDataFromExternalSources = exports.decodeValueContent = exports.encodeValueContent = exports.decodeValueType = exports.encodeValueType = exports.decodeDataSourceWithHash = exports.encodeDataSourceWithHash = exports.decodeMappingKey = exports.isDynamicKeyName = exports.encodeKeyName = exports.decodeData = exports.isDataAuthentic = exports.getVerificationMethod = exports.encodeArrayKey = exports.encodeData = exports.ProviderTypes = void 0;
exports.supportsInterface = supportsInterface;
/**
 * @file index.ts
 * @author Robert McLeod <@robertdavid010>
 * @author Fabian Vogelsteller <fabian@lukso.network>
 * @author Hugo Masclet <@Hugoo>
 * @author Jean Cavallera <@CJ42>
 * @date 2020
 */
const web3_providers_http_1 = __importDefault(require("web3-providers-http"));
const providerWrapper_1 = require("./provider/providerWrapper");
const utils_1 = require("./lib/utils");
const schemaParser_1 = require("./lib/schemaParser");
const isValidSignature_1 = require("./lib/isValidSignature");
const constants_1 = require("./constants/constants");
const encodeKeyName_1 = require("./lib/encodeKeyName");
const decodeData_1 = require("./lib/decodeData");
const getDataFromExternalSources_1 = require("./lib/getDataFromExternalSources");
const getData_1 = require("./lib/getData");
const encoder_1 = require("./lib/encoder");
const detector_1 = require("./lib/detector");
const decodeMappingKey_1 = require("./lib/decodeMappingKey");
const permissions_1 = require("./lib/permissions");
const web3_validator_1 = require("web3-validator");
var types_1 = require("./types");
Object.defineProperty(exports, "ProviderTypes", { enumerable: true, get: function () { return types_1.ProviderTypes; } });
var utils_2 = require("./lib/utils");
Object.defineProperty(exports, "encodeData", { enumerable: true, get: function () { return utils_2.encodeData; } });
Object.defineProperty(exports, "encodeArrayKey", { enumerable: true, get: function () { return utils_2.encodeArrayKey; } });
Object.defineProperty(exports, "getVerificationMethod", { enumerable: true, get: function () { return utils_2.getVerificationMethod; } });
Object.defineProperty(exports, "isDataAuthentic", { enumerable: true, get: function () { return utils_2.isDataAuthentic; } });
var decodeData_2 = require("./lib/decodeData");
Object.defineProperty(exports, "decodeData", { enumerable: true, get: function () { return decodeData_2.decodeData; } });
var encodeKeyName_2 = require("./lib/encodeKeyName");
Object.defineProperty(exports, "encodeKeyName", { enumerable: true, get: function () { return encodeKeyName_2.encodeKeyName; } });
Object.defineProperty(exports, "isDynamicKeyName", { enumerable: true, get: function () { return encodeKeyName_2.isDynamicKeyName; } });
var decodeMappingKey_2 = require("./lib/decodeMappingKey");
Object.defineProperty(exports, "decodeMappingKey", { enumerable: true, get: function () { return decodeMappingKey_2.decodeMappingKey; } });
var encoder_2 = require("./lib/encoder");
Object.defineProperty(exports, "encodeDataSourceWithHash", { enumerable: true, get: function () { return encoder_2.encodeDataSourceWithHash; } });
Object.defineProperty(exports, "decodeDataSourceWithHash", { enumerable: true, get: function () { return encoder_2.decodeDataSourceWithHash; } });
Object.defineProperty(exports, "encodeValueType", { enumerable: true, get: function () { return encoder_2.encodeValueType; } });
Object.defineProperty(exports, "decodeValueType", { enumerable: true, get: function () { return encoder_2.decodeValueType; } });
Object.defineProperty(exports, "encodeValueContent", { enumerable: true, get: function () { return encoder_2.encodeValueContent; } });
Object.defineProperty(exports, "decodeValueContent", { enumerable: true, get: function () { return encoder_2.decodeValueContent; } });
var getDataFromExternalSources_2 = require("./lib/getDataFromExternalSources");
Object.defineProperty(exports, "getDataFromExternalSources", { enumerable: true, get: function () { return getDataFromExternalSources_2.getDataFromExternalSources; } });
var permissions_2 = require("./lib/permissions");
Object.defineProperty(exports, "encodePermissions", { enumerable: true, get: function () { return permissions_2.encodePermissions; } });
Object.defineProperty(exports, "decodePermissions", { enumerable: true, get: function () { return permissions_2.decodePermissions; } });
Object.defineProperty(exports, "checkPermissions", { enumerable: true, get: function () { return permissions_2.checkPermissions; } });
Object.defineProperty(exports, "mapPermission", { enumerable: true, get: function () { return permissions_2.mapPermission; } });
var schemaParser_2 = require("./lib/schemaParser");
Object.defineProperty(exports, "getSchema", { enumerable: true, get: function () { return schemaParser_2.getSchema; } });
// PRIVATE FUNCTION
function initializeProvider(providerOrRpcUrl, gasInfo) {
    // do not fail on no-provider
    if (!providerOrRpcUrl)
        return undefined;
    // if provider is a string, assume it's a rpcUrl
    if (typeof providerOrRpcUrl === 'string') {
        return new providerWrapper_1.ProviderWrapper(new web3_providers_http_1.default(providerOrRpcUrl), gasInfo);
    }
    if (typeof providerOrRpcUrl.request === 'function' ||
        typeof providerOrRpcUrl.send === 'function')
        return new providerWrapper_1.ProviderWrapper(providerOrRpcUrl, gasInfo);
    throw new Error(`Incorrect or unsupported provider ${providerOrRpcUrl}`);
}
// PUBLIC FUNCTION
async function supportsInterface(interfaceIdOrName, options) {
    if (!(0, web3_validator_1.isAddress)(options.address)) {
        throw new Error('Invalid address');
    }
    if (!options.rpcUrl) {
        throw new Error('Missing RPC URL');
    }
    return (0, detector_1.internalSupportsInterface)(interfaceIdOrName, {
        address: options.address,
        provider: options.provider ||
            initializeProvider(options.rpcUrl, (options === null || options === void 0 ? void 0 : options.gas) ? options === null || options === void 0 ? void 0 : options.gas : constants_1.DEFAULT_GAS_VALUE),
    });
}
/**
 * This package is currently in early stages of development, <br/>use only for testing or experimentation purposes.<br/>
 *
 * @typeParam Schema
 *
 */
class ERC725 {
    /**
     * Creates an instance of ERC725.
     * @param {ERC725JSONSchema[]} schema More information available here: [LSP-2-ERC725YJSONSchema](https://github.com/lukso-network/LIPs/blob/master/LSPs/LSP-2-ERC725YJSONSchema.md)
     * @param {string} address Address of the ERC725 contract you want to interact with
     * @param {any} provider
     * @param {ERC725Config} config Configuration object.
     *
     */
    constructor(schemas, address, provider, config) {
        // NOTE: provider param can be either the provider, or and object with {provider:xxx ,type:xxx}
        // TODO: Add check for schema format?
        if (!schemas) {
            throw new Error('Missing schema.');
        }
        const defaultConfig = {
            ipfsGateway: 'https://api.universalprofile.cloud/ipfs/',
            gas: constants_1.DEFAULT_GAS_VALUE,
        };
        this.options = {
            schemas: this.validateSchemas(schemas.flatMap((schema) => (0, utils_1.duplicateMultiTypeERC725SchemaEntry)(schema))),
            address,
            provider: initializeProvider(provider, (config === null || config === void 0 ? void 0 : config.gas) ? config === null || config === void 0 ? void 0 : config.gas : defaultConfig.gas),
            ipfsGateway: (config === null || config === void 0 ? void 0 : config.ipfsGateway)
                ? (0, utils_1.convertIPFSGatewayUrl)(config === null || config === void 0 ? void 0 : config.ipfsGateway)
                : defaultConfig.ipfsGateway,
            gas: (config === null || config === void 0 ? void 0 : config.gas) ? config === null || config === void 0 ? void 0 : config.gas : defaultConfig.gas,
        };
    }
    /**
     * To prevent weird behavior from the lib, we must make sure all the schemas are correct before loading them.
     *
     * @param schemas
     * @returns
     */
    // eslint-disable-next-line class-methods-use-this
    validateSchemas(schemas) {
        return schemas.filter((schema) => {
            if (schema.valueContent === 'AssetURL' ||
                schema.valueContent === 'JSONURL') {
                console.warn(`[Deprecation notice] The schema with keyName: ${schema.name} uses deprecated valueContent: ${schema.valueContent}. It has been replaced by VerifiableURI. Decoding is backward compatible but value will be encoded as VerifiableURI.`);
            }
            try {
                const encodedKeyName = (0, encodeKeyName_1.encodeKeyName)(schema.name);
                const isKeyValid = schema.key === encodedKeyName;
                if (!isKeyValid) {
                    console.warn(`The schema with keyName: ${schema.name} is skipped because its key hash does not match its key name (expected: ${encodedKeyName}, got: ${schema.key}).`);
                }
                return isKeyValid;
            }
            catch (err) {
                // We could not encodeKeyName, probably because the key is dynamic (Mapping or MappingWithGrouping).
                // TODO: make sure the dynamic key name is valid:
                // - has max 2 variables
                // - variables are correct (<string>, <bool>, etc.)
                // Keeping dynamic keys may be an issue for getData / fetchData functions.
                return true;
            }
        });
    }
    static initializeProvider(providerOrRpcUrl, gasInfo) {
        return initializeProvider(providerOrRpcUrl, gasInfo);
    }
    getAddressAndProvider() {
        if (!this.options.address || !(0, web3_validator_1.isAddress)(this.options.address)) {
            throw new Error('Missing ERC725 contract address.');
        }
        if (!this.options.provider) {
            throw new Error('Missing provider.');
        }
        return {
            address: this.options.address,
            provider: this.options.provider,
        };
    }
    async getData(keyOrKeys) {
        this.getAddressAndProvider();
        return (0, getData_1.getData)(this.options, keyOrKeys);
    }
    async fetchData(keyOrKeys) {
        let keyNames;
        let throwException = false;
        if (Array.isArray(keyOrKeys)) {
            keyNames = keyOrKeys;
        }
        else if (!keyOrKeys) {
            keyNames = this.options.schemas
                .map((element) => element.name)
                .filter((key) => !(0, encodeKeyName_1.isDynamicKeyName)(key));
        }
        else {
            throwException = true; // If it's explicitely a single key, then we allow throwing an exception
            keyNames = [keyOrKeys];
        }
        const dataFromChain = await this.getData(keyNames);
        // NOTE: this step is executed in getData function above
        // We can optimize by computing it only once.
        const schemas = (0, utils_1.generateSchemasFromDynamicKeys)(keyNames, this.options.schemas);
        const dataFromExternalSources = await (0, getDataFromExternalSources_1.getDataFromExternalSources)(schemas, dataFromChain, this.options.ipfsGateway, throwException);
        if (keyOrKeys &&
            !Array.isArray(keyOrKeys) &&
            dataFromExternalSources.length > 0) {
            return dataFromExternalSources[0];
        }
        return dataFromExternalSources;
    }
    getSchema(keyOrKeys, providedSchemas) {
        return (0, schemaParser_1.getSchema)(keyOrKeys, this.options.schemas.concat(providedSchemas || []));
    }
    /**
     * To be able to store your data on the blockchain, you need to encode it according to your {@link ERC725JSONSchema}.
     *
     * @param {{ [key: string]: any }} data An object with one or many properties, containing the data that needs to be encoded.
     * @param schemas Additionnal ERC725JSONSchemas which will be concatenated with the schemas provided on init.
     *
     * @returns An object with hashed keys and encoded values.
     *
     * When encoding JSON it is possible to pass in the JSON object and the URL where it is available publicly.
     * The JSON will be hashed with `keccak256`.
     */
    encodeData(data, schemas) {
        return (0, utils_1.encodeData)(data, Array.prototype.concat(this.options.schemas, schemas));
    }
    /**
     * To be able to store your data on the blockchain, you need to encode it according to your {@link ERC725JSONSchema}.
     *
     * @param {{ [key: string]: any }} data An object with one or many properties, containing the data that needs to be encoded.
     * @param schemas ERC725JSONSchemas which will be used to encode the keys.
     *
     * @returns An object with hashed keys and encoded values.
     *
     * When encoding JSON it is possible to pass in the JSON object and the URL where it is available publicly.
     * The JSON will be hashed with `keccak256`.
     */
    static encodeData(data, schemas) {
        return (0, utils_1.encodeData)(data, schemas);
    }
    /**
     * In case you are reading the key-value store from an ERC725 smart-contract key-value store
     * without `@erc725/erc725.js` you can use `decodeData` to do the decoding for you.
     *
     * It is more convenient to use {@link ERC725.fetchData | `fetchData`}.
     * It does the `decoding` and `fetching` of external references for you automatically.
     *
     * @param {{ [key: string]: any }} data An object with one or many properties.
     * @param schemas ERC725JSONSchemas which will be used to encode the keys.
     *
     * @returns Returns decoded data as defined and expected in the schema:
     */
    decodeData(data, schemas) {
        return (0, decodeData_1.decodeData)(data, Array.prototype.concat(this.options.schemas, schemas));
    }
    /**
     * In case you are reading the key-value store from an ERC725 smart-contract key-value store
     * without `@erc725/erc725.js` you can use `decodeData` to do the decoding for you.
     *
     * It is more convenient to use {@link ERC725.fetchData | `fetchData`}.
     * It does the `decoding` and `fetching` of external references for you automatically.
     *
     * @param {{ [key: string]: any }} data An object with one or many properties.
     * @param schemas ERC725JSONSchemas which will be used to encode the keys.
     *
     * @returns Returns decoded data as defined and expected in the schema:
     */
    static decodeData(data, schemas) {
        return (0, decodeData_1.decodeData)(data, schemas);
    }
    /**
     * An added utility method which simply returns the owner of the contract.
     * Not directly related to ERC725 specifications.
     *
     * @param {string} [address]
     * @returns The address of the contract owner as stored in the contract.
     *
     *    This method is not yet supported when using the `graph` provider type.
     *
     * ```javascript title="Example"
     * await myERC725.getOwner();
     * // '0x94933413384997F9402cc07a650e8A34d60F437A'
     *
     * await myERC725.getOwner("0x3000783905Cc7170cCCe49a4112Deda952DDBe24");
     * // '0x7f1b797b2Ba023Da2482654b50724e92EB5a7091'
     * ```
     */
    async getOwner(_address) {
        const { address, provider } = this.getAddressAndProvider();
        return provider.getOwner(_address || address);
    }
    /**
     * A helper function which checks if a signature is valid according to the EIP-1271 standard.
     *
     * @param messageOrHash if it is a 66 chars string with 0x prefix, it will be considered as a hash (keccak256). If not, the message will be wrapped as follows: "\x19Ethereum Signed Message:\n" + message.length + message and hashed.
     * @param signature
     * @returns true if isValidSignature call on the contract returns the magic value. false otherwise
     */
    async isValidSignature(messageOrHash, signature) {
        if (!this.options.address || !(0, web3_validator_1.isAddress)(this.options.address)) {
            throw new Error('Missing ERC725 contract address.');
        }
        if (!this.options.provider) {
            throw new Error('Missing provider.');
        }
        return (0, isValidSignature_1.isValidSignature)(messageOrHash, signature, this.options.address, this.options.provider);
    }
    /**
     * Hashes a key name for use on an ERC725Y contract according to LSP2 ERC725Y JSONSchema standard.
     *
     * @param {string} keyName The key name you want to encode.
     * @param {DynamicKeyParts} dynamicKeyParts String or Array of String values used to construct the key.
     * @link https://github.com/lukso-network/LIPs/blob/main/LSPs/LSP-2-ERC725YJSONSchema.md ERC725YJsonSchema standard.
     * @returns {string} The keccak256 hash of the provided key name. This is the key that must be retrievable from the ERC725Y contract via ERC725Y.getData(bytes32 key).
     */
    static encodeKeyName(keyName, dynamicKeyParts) {
        return (0, encodeKeyName_1.encodeKeyName)(keyName, dynamicKeyParts);
    }
    /**
     * Hashes a key name for use on an ERC725Y contract according to LSP2 ERC725Y JSONSchema standard.
     *
     * @param {string} keyName The key name you want to encode.
     * @param {DynamicKeyParts} dynamicKeyParts String or Array of String values used to construct the key.
     * @link https://github.com/lukso-network/LIPs/blob/main/LSPs/LSP-2-ERC725YJSONSchema.md ERC725YJsonSchema standard.
     * @returns {string} The keccak256 hash of the provided key name. This is the key that must be retrievable from the ERC725Y contract via ERC725Y.getData(bytes32 key).
     */
    encodeKeyName(keyName, dynamicKeyParts) {
        return (0, encodeKeyName_1.encodeKeyName)(keyName, dynamicKeyParts);
    }
    /**
     * Decodes a hashed key used on an ERC725Y contract according to LSP2 ERC725Y JSONSchema standard.
     *
     * @param {string} keyHash Key hash that needs to be decoded.
     * @param {string | ERC725JSONSchema} keyNameOrSchema Key name following schema specifications or ERC725Y JSON Schema to follow in order to decode the key.
     * @link https://github.com/lukso-network/LIPs/blob/main/LSPs/LSP-2-ERC725YJSONSchema.md ERC725YJsonSchema standard.
     * @returns {DynamicKeyPart[]} The Array with all the key decoded dynamic parameters. Each object have an attribute type and value.
     */
    static decodeMappingKey(keyHash, keyNameOrSchema) {
        return (0, decodeMappingKey_1.decodeMappingKey)(keyHash, keyNameOrSchema);
    }
    /**
     * Decodes a hashed key used on an ERC725Y contract according to LSP2 ERC725Y JSONSchema standard.
     *
     * @param {string} keyHash Key hash that needs to be decoded.
     * @param {string | ERC725JSONSchema} keyNameOrSchema Key name following schema specifications or ERC725Y JSON Schema to follow in order to decode the key.
     * @link https://github.com/lukso-network/LIPs/blob/main/LSPs/LSP-2-ERC725YJSONSchema.md ERC725YJsonSchema standard.
     * @returns {DynamicKeyPart[]} The Array with all the key decoded dynamic parameters. Each object have an attribute type and value.
     */
    decodeMappingKey(keyHash, keyNameOrSchema) {
        return (0, decodeMappingKey_1.decodeMappingKey)(keyHash, keyNameOrSchema);
    }
    /**
     * Check if the ERC725 object supports
     * a certain interface.
     *
     * @param interfaceIdOrName Interface ID or supported interface name.
     * @returns {Promise<boolean>} if interface is supported.
     */
    async supportsInterface(interfaceIdOrName) {
        const { address, provider } = this.getAddressAndProvider();
        return (0, detector_1.internalSupportsInterface)(interfaceIdOrName, {
            address,
            provider,
        });
    }
    /**
     * Check if a smart contract address
     * supports a certain interface.
     *
     * @param {string} interfaceIdOrName Interface ID or supported interface name.
     * @param options Object of address, RPC URL and optional gas.
     * @returns {Promise<boolean>} if interface is supported.
     */
    static async supportsInterface(interfaceIdOrName, options) {
        return supportsInterface(interfaceIdOrName, options);
    }
    // Permissions related functions
    // -----------------------------
    /**
     * Encode permissions into a hexadecimal string as defined by the LSP6 KeyManager Standard.
     *
     * @link https://github.com/lukso-network/LIPs/blob/main/LSPs/LSP-6-KeyManager.md LSP6 KeyManager Standard.
     * @param permissions The permissions you want to specify to be included or excluded. Any ommitted permissions will default to false.
     * @returns {*} The permissions encoded as a hexadecimal string as defined by the LSP6 Standard.
     */
    static encodePermissions(permissions) {
        return (0, permissions_1.encodePermissions)(permissions);
    }
    /**
     * Encode permissions into a hexadecimal string as defined by the LSP6 KeyManager Standard.
     *
     * @link https://github.com/lukso-network/LIPs/blob/main/LSPs/LSP-6-KeyManager.md LSP6 KeyManager Standard.
     * @param permissions The permissions you want to specify to be included or excluded. Any ommitted permissions will default to false.
     * @returns {*} The permissions encoded as a hexadecimal string as defined by the LSP6 Standard.
     */
    encodePermissions(permissions) {
        return (0, permissions_1.encodePermissions)(permissions);
    }
    /**
     * Decodes permissions from hexadecimal as defined by the LSP6 KeyManager Standard.
     *
     * @link https://github.com/lukso-network/LIPs/blob/main/LSPs/LSP-6-KeyManager.md LSP6 KeyManager Standard.
     * @param permissionHex The permission hexadecimal value to be decoded.
     * @returns Object specifying whether default LSP6 permissions are included in provided hexademical string.
     */
    static decodePermissions(permissionHex) {
        return (0, permissions_1.decodePermissions)(permissionHex);
    }
    /**
     * Decodes permissions from hexadecimal as defined by the LSP6 KeyManager Standard.
     *
     * @link https://github.com/lukso-network/LIPs/blob/main/LSPs/LSP-6-KeyManager.md LSP6 KeyManager Standard.
     * @param permissionHex The permission hexadecimal value to be decoded.
     * @returns Object specifying whether default LSP6 permissions are included in provided hexademical string.
     */
    decodePermissions(permissionHex) {
        return (0, permissions_1.decodePermissions)(permissionHex);
    }
    /**
     * Check if the required permissions are included in the granted permissions as defined by the LSP6 KeyManager Standard.
     *
     * @link https://github.com/lukso-network/LIPs/blob/main/LSPs/LSP-6-KeyManager.md LSP6 KeyManager Standard.
     * @param requiredPermissions An array of required permissions or a single required permission.
     * @param grantedPermissions The granted permissions as a 32-byte hex string.
     * @return A boolean value indicating whether the required permissions are included in the granted permissions.
     */
    static checkPermissions(requiredPermissions, grantedPermissions) {
        return (0, permissions_1.checkPermissions)(requiredPermissions, grantedPermissions);
    }
    /**
     * Check if the required permissions are included in the granted permissions as defined by the LSP6 KeyManager Standard.
     *
     * @link https://github.com/lukso-network/LIPs/blob/main/LSPs/LSP-6-KeyManager.md LSP6 KeyManager Standard.
     * @param requiredPermissions An array of required permissions or a single required permission.
     * @param grantedPermissions The granted permissions as a 32-byte hex string.
     * @return A boolean value indicating whether the required permissions are included in the granted permissions.
     */
    checkPermissions(requiredPermissions, grantedPermissions) {
        return (0, permissions_1.checkPermissions)(requiredPermissions, grantedPermissions);
    }
    static mapPermission(permission) {
        return (0, permissions_1.mapPermission)(permission);
    }
    mapPermission(permission) {
        return (0, permissions_1.mapPermission)(permission);
    }
    // Encoding methods
    // ----------------
    /**
     * @param type The valueType to encode the value as
     * @param value The value to encode
     * @returns The encoded value
     */
    static encodeValueType(type, value) {
        return (0, encoder_1.encodeValueType)(type, value);
    }
    encodeValueType(type, value) {
        return (0, encoder_1.encodeValueType)(type, value);
    }
    /**
     * @param type The valueType to decode the value as
     * @param data The data to decode
     * @returns The decoded value
     */
    static decodeValueType(type, data) {
        return (0, encoder_1.decodeValueType)(type, data);
    }
    decodeValueType(type, data) {
        return (0, encoder_1.decodeValueType)(type, data);
    }
    static encodeValueContent(valueContent, value) {
        return (0, encoder_1.encodeValueContent)(valueContent, value);
    }
    encodeValueContent(valueContent, value) {
        return (0, encoder_1.encodeValueContent)(valueContent, value);
    }
    static decodeValueContent(valueContent, value) {
        return (0, encoder_1.decodeValueContent)(valueContent, value);
    }
    decodeValueContent(valueContent, value) {
        return (0, encoder_1.decodeValueContent)(valueContent, value);
    }
    // External Data Source utilities (`VerifiableURI` and `JSONURI`)
    // ----------------------------------------------------------------
    encodeDataSourceWithHash(verification, dataSource) {
        return (0, encoder_1.encodeDataSourceWithHash)(verification, dataSource);
    }
    static encodeDataSourceWithHash(verification, dataSource) {
        return (0, encoder_1.encodeDataSourceWithHash)(verification, dataSource);
    }
    decodeDataSourceWithHash(value) {
        return (0, encoder_1.decodeDataSourceWithHash)(value);
    }
    static decodeDataSourceWithHash(value) {
        return (0, encoder_1.decodeDataSourceWithHash)(value);
    }
    static getVerificationMethod(nameOrSig) {
        return (0, utils_1.getVerificationMethod)(nameOrSig);
    }
    getVerificationMethod(nameOrSig) {
        return (0, utils_1.getVerificationMethod)(nameOrSig);
    }
    static isDataAuthentic(data, verificationOptions) {
        return (0, utils_1.isDataAuthentic)(data, verificationOptions);
    }
    isDataAuthentic(data, verificationOptions) {
        return (0, utils_1.isDataAuthentic)(data, verificationOptions);
    }
}
exports.ERC725 = ERC725;
exports.default = ERC725;
//# sourceMappingURL=index.js.map