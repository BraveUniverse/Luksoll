"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkPermissions = void 0;
exports.encodePermissions = encodePermissions;
exports.decodePermissions = decodePermissions;
exports.mapPermission = mapPermission;
const web3_utils_1 = require("web3-utils");
const constants_1 = require("../constants/constants");
const web3_validator_1 = require("web3-validator");
function encodePermissions(permissions) {
    let basePermissions = BigInt(0);
    // Process each permission to potentially switch off permissions included in ALL_PERMISSIONS
    // Deal with ALL_PERMISSIONS first IMPORTANT!
    const keys = Object.keys(permissions).filter((key) => key !== 'ALL_PERMISSIONS');
    keys.splice(0, 0, 'ALL_PERMISSIONS');
    // Do not use an for of loop here to not require the regenerator runtime
    for (let i = 0; i < keys.length; i += 1) {
        const key = keys[i];
        const permissionValue = BigInt((0, web3_utils_1.hexToNumber)(constants_1.LSP6_DEFAULT_PERMISSIONS[key]));
        if (key in permissions) {
            if (permissions[key]) {
                basePermissions |= permissionValue;
            }
            else {
                basePermissions &= ~permissionValue;
            }
        }
    }
    // Convert the final BigInt permission value back to a hex string, properly padded
    return (0, web3_utils_1.leftPad)((0, web3_utils_1.numberToHex)(basePermissions.toString()), 64);
}
function decodePermissions(permissionHex) {
    const result = {
        CHANGEOWNER: false,
        ADDCONTROLLER: false,
        EDITPERMISSIONS: false,
        ADDEXTENSIONS: false,
        CHANGEEXTENSIONS: false,
        ADDUNIVERSALRECEIVERDELEGATE: false,
        CHANGEUNIVERSALRECEIVERDELEGATE: false,
        REENTRANCY: false,
        SUPER_TRANSFERVALUE: false,
        TRANSFERVALUE: false,
        SUPER_CALL: false,
        CALL: false,
        SUPER_STATICCALL: false,
        STATICCALL: false,
        SUPER_DELEGATECALL: false,
        DELEGATECALL: false,
        DEPLOY: false,
        SUPER_SETDATA: false,
        SETDATA: false,
        ENCRYPT: false,
        DECRYPT: false,
        SIGN: false,
        EXECUTE_RELAY_CALL: false,
        ERC4337_PERMISSION: false,
        ALL_PERMISSIONS: false,
    };
    const permissionsToTest = Object.keys(constants_1.LSP6_DEFAULT_PERMISSIONS);
    const passedPermissionDecimal = BigInt((0, web3_utils_1.hexToNumber)(permissionHex));
    // Do not use an for of loop here to not require the regenerator runtime
    // Deal with ALL_PERMISSIONS the same way. So as long as all the bits in ALL_PERMISSIONS
    // are set the same way as in ALL_PERMISSIONS then this flag will return as true.
    // It does not mean some extra permissions are not included.
    for (let i = 0; i < permissionsToTest.length; i += 1) {
        const testPermission = permissionsToTest[i];
        const decimalTestPermission = BigInt((0, web3_utils_1.hexToNumber)(constants_1.LSP6_DEFAULT_PERMISSIONS[testPermission]));
        const isPermissionIncluded = (passedPermissionDecimal & decimalTestPermission) ===
            decimalTestPermission;
        result[testPermission] = isPermissionIncluded;
    }
    return result;
}
/**
 * @notice Map a permission to its corresponding bytes32 representation.
 * @param permission The permission string to be mapped.
 * @return The bytes32 representation of the permission.
 * @dev Return null if the input is not a known permission name or a valid 32-byte hex string.
 */
function mapPermission(permission) {
    if (!constants_1.LSP6_DEFAULT_PERMISSIONS[permission] && !(0, web3_validator_1.isHexStrict)(permission)) {
        return null;
    }
    return constants_1.LSP6_DEFAULT_PERMISSIONS[permission] || permission;
}
/**
 * @notice Check if the required permissions are included in the granted permissions.
 * @param requiredPermissions An array of required permissions or a single required permission.
 * @param grantedPermissions The granted permissions as a 32-byte hex string.
 * @return A boolean value indicating whether the required permissions are included in the granted permissions.
 * @dev Throws an error if the grantedPermissions input is not a valid 32-byte hex string.
 */
const checkPermissions = (requiredPermissions, grantedPermissions) => {
    // Validate the grantedPermissions string
    if (!(0, web3_validator_1.isHexStrict)(grantedPermissions)) {
        throw new Error('Invalid grantedPermissions string. It must be a valid 32-byte hex string.');
    }
    // Convert requiredPermissions to an array if it's a single string
    const requiredPermissionArray = Array.isArray(requiredPermissions)
        ? requiredPermissions
        : [requiredPermissions];
    // Map the literal permissions to their bytes32 representation
    const mappedPermissionArray = requiredPermissionArray.map(mapPermission);
    // Perform the AND operation check for each required permission
    return mappedPermissionArray.every((requiredPermission, index) => {
        if (!requiredPermission) {
            throw new Error(`Invalid permission string: ${requiredPermissionArray[index]}. It must be a valid 32-byte hex string or a known permission name.`);
        }
        const requiredPermissionBigInt = BigInt(requiredPermission);
        const grantedPermissionsBigInt = BigInt(grantedPermissions);
        return ((requiredPermissionBigInt & grantedPermissionsBigInt) ===
            requiredPermissionBigInt);
    });
};
exports.checkPermissions = checkPermissions;
//# sourceMappingURL=permissions.js.map