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
    along with web3.js.  If not, see <http://www.gnu.org/licenses/>.
*/
/**
 * @file providers/web3ProviderWrapper.ts
 * @author Robert McLeod <@robertdavid010>, Fabian Vogelsteller <fabian@lukso.network>
 * @date 2020
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProviderWrapper = void 0;
/*
  This file will handle querying the Ethereum web3 rpc based on a given provider
  in accordance with implementation of smart contract interfaces of ERC725
*/
const web3_eth_abi_1 = require("web3-eth-abi");
const Method_1 = require("../types/Method");
const provider_wrapper_utils_1 = require("../lib/provider-wrapper-utils");
const provider_1 = require("../types/provider");
const constants_1 = require("../constants/constants");
class ProviderWrapper {
    constructor(provider, gasInfo) {
        if (typeof provider.request === 'function') {
            this.type = provider_1.ProviderTypes.ETHEREUM;
        }
        else {
            this.type = provider_1.ProviderTypes.WEB3;
        }
        this.provider = provider;
        this.gas = gasInfo;
    }
    async getOwner(address) {
        const result = await this.callContract((0, provider_wrapper_utils_1.constructJSONRPC)(address, Method_1.Method.OWNER, this.gas));
        return (0, provider_wrapper_utils_1.decodeResult)(Method_1.Method.OWNER, result);
    }
    async getErc725YVersion(address) {
        const isErc725Yv5 = await this.supportsInterface(address, constants_1.ERC725Y_INTERFACE_IDS['5.0']);
        if (isErc725Yv5) {
            return constants_1.ERC725_VERSION.ERC725_v5;
        }
        const isErc725Yv3 = await this.supportsInterface(address, constants_1.ERC725Y_INTERFACE_IDS['3.0']);
        // The version 3 of the package can use the getData function from v2, still compatible
        if (isErc725Yv3) {
            return constants_1.ERC725_VERSION.ERC725_v2;
        }
        const isErc725Yv2 = await this.supportsInterface(address, constants_1.ERC725Y_INTERFACE_IDS['2.0']);
        if (isErc725Yv2) {
            return constants_1.ERC725_VERSION.ERC725_v2;
        }
        // v0.2.0 and v0.6.0 have the same function signatures for getData, only versions before v0.2.0 requires a different call
        const isErc725YLegacy = await this.supportsInterface(address, constants_1.ERC725Y_INTERFACE_IDS.legacy);
        if (isErc725YLegacy) {
            return constants_1.ERC725_VERSION.ERC725_LEGACY;
        }
        return constants_1.ERC725_VERSION.NOT_ERC725;
    }
    /**
     * https://eips.ethereum.org/EIPS/eip-165
     *
     * @param address the smart contract address
     * @param interfaceId ERC-165 identifier as described here: https://github.com/ERC725Alliance/ERC725/blob/develop/docs/ERC-725.md#specification
     */
    async supportsInterface(address, interfaceId) {
        const result = await this.callContract((0, provider_wrapper_utils_1.constructJSONRPC)(address, Method_1.Method.SUPPORTS_INTERFACE, this.gas, `${interfaceId}${'00000000000000000000000000000000000000000000000000000000'}`));
        return (0, provider_wrapper_utils_1.decodeResult)(Method_1.Method.SUPPORTS_INTERFACE, result);
    }
    /**
     * https://eips.ethereum.org/EIPS/eip-1271
     *
     * @param address the contract address
     * @param hash
     * @param signature
     */
    async isValidSignature(address, hash, signature) {
        if (this.type === provider_1.ProviderTypes.ETHEREUM) {
            const encodedParams = (0, web3_eth_abi_1.encodeParameters)(['bytes32', 'bytes'], [hash, signature]);
            const result = await this.callContract((0, provider_wrapper_utils_1.constructJSONRPC)(address, Method_1.Method.IS_VALID_SIGNATURE, undefined, // this.gas,
            encodedParams));
            if (result.error) {
                throw result.error;
            }
            // Passing Method.IS_VALID_SIGNATURE ensures this will be string
            return (0, provider_wrapper_utils_1.decodeResult)(Method_1.Method.IS_VALID_SIGNATURE, result);
        }
        const encodedParams = (0, web3_eth_abi_1.encodeParameters)(['bytes32', 'bytes'], [hash, signature]);
        const results = await this.callContract([
            (0, provider_wrapper_utils_1.constructJSONRPC)(address, Method_1.Method.IS_VALID_SIGNATURE, undefined, // this.gas,
            encodedParams),
        ]);
        if (results.error) {
            throw results.error;
        }
        // Passing Method.IS_VALID_SIGNATURE ensures this will be string
        return (0, provider_wrapper_utils_1.decodeResult)(Method_1.Method.IS_VALID_SIGNATURE, results[0].result);
    }
    async getData(address, keyHash) {
        const result = await this.getAllData(address, [keyHash]);
        try {
            return result[0].value;
        }
        catch (_a) {
            return null;
        }
    }
    async getAllData(address, keyHashes) {
        const erc725Version = await this.getErc725YVersion(address);
        if (erc725Version === constants_1.ERC725_VERSION.NOT_ERC725) {
            throw new Error(`Contract: ${address} does not support ERC725Y interface.`);
        }
        switch (erc725Version) {
            case constants_1.ERC725_VERSION.ERC725_v5:
                return this._getAllDataGeneric(address, keyHashes, Method_1.Method.GET_DATA_BATCH);
            case constants_1.ERC725_VERSION.ERC725_v2:
                return this._getAllDataGeneric(address, keyHashes, Method_1.Method.GET_DATA);
            case constants_1.ERC725_VERSION.ERC725_LEGACY:
                return this._getAllDataLegacy(address, keyHashes);
            default:
                return [];
        }
    }
    async _getAllDataGeneric(address, keyHashes, method) {
        if (this.type === provider_1.ProviderTypes.ETHEREUM) {
            const encodedResults = await this.callContract((0, provider_wrapper_utils_1.constructJSONRPC)(address, method, undefined, // this.gas,
            (0, web3_eth_abi_1.encodeParameter)('bytes32[]', keyHashes)));
            const decodedValues = (0, provider_wrapper_utils_1.decodeResult)(method, encodedResults);
            return keyHashes.map((keyHash, index) => ({
                key: keyHash,
                value: decodedValues ? decodedValues[index] : decodedValues,
            }));
        }
        const payload = [
            (0, provider_wrapper_utils_1.constructJSONRPC)(address, method, undefined, // this.gas,
            (0, web3_eth_abi_1.encodeParameter)('bytes32[]', keyHashes)),
        ];
        const results = await this.callContract(payload);
        const decodedValues = (0, provider_wrapper_utils_1.decodeResult)(method, results[0].result);
        return keyHashes.map((key, index) => ({
            key,
            value: decodedValues ? decodedValues[index] : decodedValues,
        }));
    }
    async _getAllDataLegacy(address, keyHashes) {
        if (this.type === provider_1.ProviderTypes.ETHEREUM) {
            // Here we could use `getDataMultiple` instead of sending multiple calls to `getData`
            // But this is already legacy and it won't be used anymore..
            const encodedResultsPromises = keyHashes.map((keyHash) => this.callContract((0, provider_wrapper_utils_1.constructJSONRPC)(address, Method_1.Method.GET_DATA_LEGACY, this.gas, keyHash)));
            const decodedResults = await Promise.all(encodedResultsPromises);
            return decodedResults.map((decodedResult, index) => ({
                key: keyHashes[index],
                value: (0, provider_wrapper_utils_1.decodeResult)(Method_1.Method.GET_DATA_LEGACY, decodedResult),
            }));
        }
        const payload = [];
        // Here we could use `getDataMultiple` instead of sending multiple calls to `getData`
        // But this is already legacy and it won't be used anymore..
        for (let index = 0; index < keyHashes.length; index++) {
            payload.push((0, provider_wrapper_utils_1.constructJSONRPC)(address, Method_1.Method.GET_DATA_LEGACY, this.gas, keyHashes[index]));
        }
        const results = await this.callContract(payload);
        return payload.map((payloadCall, index) => ({
            key: keyHashes[index],
            value: (0, provider_wrapper_utils_1.decodeResult)(Method_1.Method.GET_DATA_LEGACY, results.find((element) => payloadCall.id === element.id).result),
        }));
    }
    async callContract(payload) {
        // Make this mock provider always return the result in terms of data.
        // So if the result is wrapped in an object as result.result then unwrap it.
        // Some code was assuming it's wrapped and other was it's not wrapped.
        if (this.type === provider_1.ProviderTypes.ETHEREUM) {
            const result = await this.provider.request(payload);
            if (result.error) {
                const error = new Error('Call failed');
                Object.assign(error, result.error);
                throw error;
            }
            if (result.result) {
                return result.result;
            }
            return result;
        }
        return new Promise((resolve, reject) => {
            // Send old web3 method with callback to resolve promise
            // This is deprecated: https://docs.metamask.io/guide/ethereum-provider.html#ethereum-send-deprecated
            this.provider.send(payload, (e, r) => {
                if (e) {
                    reject(e);
                }
                else {
                    if (r.error) {
                        let error;
                        ({ error } = r);
                        if (!(error instanceof Error)) {
                            error = new Error('Call failed');
                            Object.assign(error, r.error);
                        }
                        reject(error);
                        return;
                    }
                    if (r.result) {
                        resolve(r.result);
                        return;
                    }
                    resolve(r);
                }
            });
        });
    }
}
exports.ProviderWrapper = ProviderWrapper;
//# sourceMappingURL=providerWrapper.js.map