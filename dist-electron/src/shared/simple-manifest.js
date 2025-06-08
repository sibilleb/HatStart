"use strict";
/**
 * Simple Manifest System
 * Everything you need in one place - no complexity, just functionality
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_MANIFEST = void 0;
__exportStar(require("./simple-manifest-types"), exports);
__exportStar(require("./simple-manifest-loader"), exports);
__exportStar(require("./simple-manifest-validator"), exports);
// Re-export default tools for convenience
const default_tools_json_1 = __importDefault(require("./default-tools.json"));
exports.DEFAULT_MANIFEST = default_tools_json_1.default;
//# sourceMappingURL=simple-manifest.js.map