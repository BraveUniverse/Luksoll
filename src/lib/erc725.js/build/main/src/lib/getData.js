"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getData = void 0;
const encodeKeyName_1 = require("./encodeKeyName");
const utils_1 = require("./utils");
const decodeData_1 = require("./decodeData");
/**
 * @internal
 * @param schema associated with the schema with keyType = 'Array'
 *               the data includes the raw (encoded) length key-value pair for the array
 * @param data array of key-value pairs, one of which is the length key for the schema array
 *             Data can hold other field data not relevant here, and will be ignored
 * @return an array of keys/values
 */
const getArrayValues = async (erc725Options, schema, data) => {
    var _a;
    if (schema.keyType !== 'Array') {
        throw new Error(`The "getArrayValues" method requires a schema definition with "keyType: Array",
         ${schema}`);
    }
    const results = [];
    // 1. get the array length
    const value = data[schema.key]; // get the length key/value pair
    if (!value || !value.value) {
        return results;
    } // Handle empty/non-existent array
    const arrayLength = await (0, utils_1.decodeKeyValue)('Number', 'uint128', value.value, schema.name); // get the int array length
    const arrayElementKeys = [];
    for (let index = 0; index < arrayLength; index++) {
        const arrayElementKey = (0, utils_1.encodeArrayKey)(schema.key, index);
        if (!data[arrayElementKey]) {
            arrayElementKeys.push(arrayElementKey);
        }
    }
    try {
        const arrayElements = await ((_a = erc725Options.provider) === null || _a === void 0 ? void 0 : _a.getAllData(erc725Options.address, arrayElementKeys));
        results.push(...arrayElements);
    }
    catch (err) {
        // This case may happen if user requests an array key which does not exist in the contract.
        // In this case, we simply skip
    }
    return results;
};
const getDataMultiple = async (erc725Options, keyNames) => {
    var _a;
    const schemas = (0, utils_1.generateSchemasFromDynamicKeys)(keyNames, erc725Options.schemas);
    // Get all the raw data from the provider based on schema key hashes
    const allRawData = await ((_a = erc725Options.provider) === null || _a === void 0 ? void 0 : _a.getAllData(erc725Options.address, schemas.map((schema) => schema.key)));
    const keyValueMap = allRawData.reduce((accumulator, current) => {
        accumulator[current.key] = current.value;
        return accumulator;
    }, {});
    const schemasWithValue = schemas.map((schema) => {
        return Object.assign(Object.assign({}, schema), { value: keyValueMap[schema.key] || null });
    });
    // ------- BEGIN ARRAY HANDLER -------
    // Get missing 'Array' fields for all arrays, as necessary
    const arraySchemas = schemas.filter((e) => e.keyType.toLowerCase() === 'array');
    // Looks like it gets array even if not requested as it gets the arrays from the this.options.schemas?
    // eslint-disable-next-line no-restricted-syntax
    for (const keySchema of arraySchemas) {
        try {
            const dataKeyValue = {
                [keySchema.key]: {
                    key: keySchema.key,
                    value: keyValueMap[keySchema.key],
                },
            };
            const arrayValues = await getArrayValues(erc725Options, keySchema, dataKeyValue);
            if (arrayValues && arrayValues.length > 0) {
                arrayValues.push(dataKeyValue[keySchema.key]); // add the raw data array length
                schemasWithValue[schemasWithValue.findIndex((schema) => schema.key === keySchema.key)] = Object.assign(Object.assign({}, keySchema), { value: arrayValues });
            }
        }
        catch (error) {
            console.error(error);
        }
    }
    // ------- END ARRAY HANDLER -------
    return (0, decodeData_1.decodeData)(schemasWithValue.map(({ key, value }) => {
        return {
            keyName: key,
            value,
            // no need to add dynamic key parts here as the schemas object below already holds the "generated" schemas for the dynamic keys
        };
    }), schemas);
};
/**
 * Gets **decoded data** for one, many or all keys of the specified `ERC725` smart-contract.
 * When omitting the `keyOrKeys` parameter, it will get all the keys (as per {@link ERC725JSONSchema | ERC725JSONSchema} definition).
 *
 * Data returned by this function does not contain external data of [`JSONURL`](https://github.com/lukso-network/LIPs/blob/master/LSPs/LSP-2-ERC725YJSONSchema.md#jsonurl)
 * or [`ASSETURL`](https://github.com/lukso-network/LIPs/blob/master/LSPs/LSP-2-ERC725YJSONSchema.md#asseturl) schema elements.
 *
 * If you would like to receive everything in one go, you can use fetchData() from index.ts for that.
 *
 * @param {*} keyOrKeys The name (or the encoded name as the schema ‘key’) of the schema element in the class instance’s schema.
 *
 * @returns If the input is an array: an object with schema element key names as properties, with corresponding **decoded** data as values. If the input is a string, it directly returns the **decoded** data.
 */
const getData = async (erc725Options, _keyOrKeys) => {
    let keyOrKeys = _keyOrKeys;
    if (!keyOrKeys) {
        // eslint-disable-next-line no-param-reassign
        keyOrKeys = erc725Options.schemas
            .map((element) => element.name)
            .filter((key) => !(0, encodeKeyName_1.isDynamicKeyName)(key));
    }
    if (Array.isArray(keyOrKeys)) {
        return getDataMultiple(erc725Options, keyOrKeys);
    }
    const data = await getDataMultiple(erc725Options, [keyOrKeys]);
    return data[0];
};
exports.getData = getData;
//# sourceMappingURL=getData.js.map