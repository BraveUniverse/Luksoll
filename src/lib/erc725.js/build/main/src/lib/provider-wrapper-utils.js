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
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodeResult = decodeResult;
exports.constructJSONRPC = constructJSONRPC;
const web3_eth_abi_1 = require("web3-eth-abi");
const web3_utils_1 = require("web3-utils");
const constants_1 = require("../constants/constants");
let idCount = 0;
function decodeResult(method, hexString) {
    if (!hexString || hexString === '0x' || hexString === '') {
        return null;
    }
    const decodedData = (0, web3_eth_abi_1.decodeParameter)(constants_1.METHODS[method].returnEncoding, hexString);
    if (Array.isArray(decodedData) &&
        decodedData.length === 1 &&
        decodedData[0] === '0x') {
        return [null];
    }
    return decodedData;
}
const constructJSONRPCParams = (address, method, gasInfo, methodParam) => {
    const data = methodParam
        ? constants_1.METHODS[method].sig + methodParam.replace('0x', '')
        : constants_1.METHODS[method].sig;
    return [
        Object.assign(Object.assign({ to: address, value: constants_1.METHODS[method].value }, (gasInfo ? { gas: (0, web3_utils_1.numberToHex)(gasInfo) } : {})), { data }),
        'latest',
    ];
};
function constructJSONRPC(address, method, gasInfo, methodParam) {
    idCount += 1;
    return {
        jsonrpc: '2.0',
        method: 'eth_call',
        params: constructJSONRPCParams(address, method, gasInfo, methodParam),
        id: idCount,
    };
}
//# sourceMappingURL=provider-wrapper-utils.js.map