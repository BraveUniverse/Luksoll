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
exports.internalSupportsInterface = void 0;
// https://docs.lukso.tech/standards/standard-detection
/**
 * @file detector.ts
 * @author Hugo Masclet <@Hugoo>
 * @author Felix Hildebrandt <@fhildeb>
 * @date 2022
 */
const interfaces_1 = require("../constants/interfaces");
/**
 * Check if a smart contract address
 * supports a certain interface.
 *
 * @param {string} interfaceId  Interface ID or supported interface name.
 * @param options Object with address and RPC URL.
 * @returns {Promise<boolean>} if interface is supported.
 */
const internalSupportsInterface = async (interfaceIdOrName, options) => {
    let plainInterfaceId;
    if (interfaces_1.INTERFACE_IDS_0_12_0[interfaceIdOrName]) {
        plainInterfaceId = interfaces_1.INTERFACE_IDS_0_12_0[interfaceIdOrName];
    }
    else {
        plainInterfaceId = interfaceIdOrName;
    }
    try {
        return await options.provider.supportsInterface(options.address, plainInterfaceId);
    }
    catch (error) {
        throw new Error(`Error checking the interface: ${error}`);
    }
};
exports.internalSupportsInterface = internalSupportsInterface;
//# sourceMappingURL=detector.js.map