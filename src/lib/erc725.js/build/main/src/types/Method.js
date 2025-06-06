"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Encoding = exports.Method = void 0;
var Method;
(function (Method) {
    Method["GET_DATA_LEGACY"] = "getDataLegacy";
    Method["GET_DATA"] = "getData";
    Method["GET_DATA_BATCH"] = "getDataBatch";
    Method["OWNER"] = "owner";
    Method["SUPPORTS_INTERFACE"] = "supportsInterface";
    Method["IS_VALID_SIGNATURE"] = "isValidSignature";
})(Method || (exports.Method = Method = {}));
var Encoding;
(function (Encoding) {
    Encoding["BYTES"] = "bytes";
    Encoding["BYTES4"] = "bytes4";
    Encoding["BOOL"] = "bool";
    Encoding["UINT256"] = "uint256";
    Encoding["BYTES32_ARRAY"] = "bytes32[]";
    Encoding["BYTES_ARRAY"] = "bytes[]";
    Encoding["ADDRESS"] = "address";
})(Encoding || (exports.Encoding = Encoding = {}));
//# sourceMappingURL=Method.js.map