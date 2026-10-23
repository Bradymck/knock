let wasm;

function debugString(val) {
    // primitive types
    const type = typeof val;
    if (type == 'number' || type == 'boolean' || val == null) {
        return  `${val}`;
    }
    if (type == 'string') {
        return `"${val}"`;
    }
    if (type == 'symbol') {
        const description = val.description;
        if (description == null) {
            return 'Symbol';
        } else {
            return `Symbol(${description})`;
        }
    }
    if (type == 'function') {
        const name = val.name;
        if (typeof name == 'string' && name.length > 0) {
            return `Function(${name})`;
        } else {
            return 'Function';
        }
    }
    // objects
    if (Array.isArray(val)) {
        const length = val.length;
        let debug = '[';
        if (length > 0) {
            debug += debugString(val[0]);
        }
        for(let i = 1; i < length; i++) {
            debug += ', ' + debugString(val[i]);
        }
        debug += ']';
        return debug;
    }
    // Test for built-in
    const builtInMatches = /\[object ([^\]]+)\]/.exec(toString.call(val));
    let className;
    if (builtInMatches && builtInMatches.length > 1) {
        className = builtInMatches[1];
    } else {
        // Failed to match the standard '[object ClassName]'
        return toString.call(val);
    }
    if (className == 'Object') {
        // we're a user defined class or Object
        // JSON.stringify avoids problems with cycles, and is generally much
        // easier than looping through ownProperties of `val`.
        try {
            return 'Object(' + JSON.stringify(val) + ')';
        } catch (_) {
            return 'Object';
        }
    }
    // errors
    if (val instanceof Error) {
        return `${val.name}: ${val.message}\n${val.stack}`;
    }
    // TODO we could test for more things here, like `Set`s and `Map`s.
    return className;
}

let WASM_VECTOR_LEN = 0;

let cachedUint8ArrayMemory0 = null;

function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

const cachedTextEncoder = new TextEncoder();

if (!('encodeInto' in cachedTextEncoder)) {
    cachedTextEncoder.encodeInto = function (arg, view) {
        const buf = cachedTextEncoder.encode(arg);
        view.set(buf);
        return {
            read: arg.length,
            written: buf.length
        };
    }
}

function passStringToWasm0(arg, malloc, realloc) {

    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

    const mem = getUint8ArrayMemory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }

    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
        const ret = cachedTextEncoder.encodeInto(arg, view);

        offset += ret.written;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

let cachedDataViewMemory0 = null;

function getDataViewMemory0() {
    if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer.detached === true || (cachedDataViewMemory0.buffer.detached === undefined && cachedDataViewMemory0.buffer !== wasm.memory.buffer)) {
        cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
    }
    return cachedDataViewMemory0;
}

function isLikeNone(x) {
    return x === undefined || x === null;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });

cachedTextDecoder.decode();

const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(ptr, len) {
    numBytesDecoded += len;
    if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
        cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
        cachedTextDecoder.decode();
        numBytesDecoded = len;
    }
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

function getStringFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return decodeText(ptr, len);
}

function addToExternrefTable0(obj) {
    const idx = wasm.__externref_table_alloc();
    wasm.__wbindgen_externrefs.set(idx, obj);
    return idx;
}

function handleError(f, args) {
    try {
        return f.apply(this, args);
    } catch (e) {
        const idx = addToExternrefTable0(e);
        wasm.__wbindgen_exn_store(idx);
    }
}

function getArrayU8FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

const CLOSURE_DTORS = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(state => state.dtor(state.a, state.b));

function makeMutClosure(arg0, arg1, dtor, f) {
    const state = { a: arg0, b: arg1, cnt: 1, dtor };
    const real = (...args) => {

        // First up with a closure we increment the internal reference
        // count. This ensures that the Rust closure environment won't
        // be deallocated while we're invoking it.
        state.cnt++;
        const a = state.a;
        state.a = 0;
        try {
            return f(a, state.b, ...args);
        } finally {
            state.a = a;
            real._wbg_cb_unref();
        }
    };
    real._wbg_cb_unref = () => {
        if (--state.cnt === 0) {
            state.dtor(state.a, state.b);
            state.a = 0;
            CLOSURE_DTORS.unregister(state);
        }
    };
    CLOSURE_DTORS.register(real, state, state);
    return real;
}

function takeFromExternrefTable0(idx) {
    const value = wasm.__wbindgen_externrefs.get(idx);
    wasm.__externref_table_dealloc(idx);
    return value;
}
/**
 * Derive master key from BIP39 mnemonic phrase
 * @param {string} mnemonic
 * @param {string | null} [passphrase]
 * @returns {ExtendedKey}
 */
export function deriveMasterKeyFromMnemonic(mnemonic, passphrase) {
    const ptr0 = passStringToWasm0(mnemonic, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    var ptr1 = isLikeNone(passphrase) ? 0 : passStringToWasm0(passphrase, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    var len1 = WASM_VECTOR_LEN;
    const ret = wasm.deriveMasterKeyFromMnemonic(ptr0, len0, ptr1, len1);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return ExtendedKey.__wrap(ret[0]);
}

function passArray8ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 1, 1) >>> 0;
    getUint8ArrayMemory0().set(arg, ptr / 1);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}
/**
 * Sign a message string with a private key
 * @param {Uint8Array} private_key_bytes
 * @param {string} message
 * @returns {Signature}
 */
export function signMessage(private_key_bytes, message) {
    const ptr0 = passArray8ToWasm0(private_key_bytes, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(message, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.signMessage(ptr0, len0, ptr1, len1);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * Hash a public key to get its digest (for use in PKH)
 * @param {Uint8Array} public_key_bytes
 * @returns {string}
 */
export function hashPublicKey(public_key_bytes) {
    let deferred3_0;
    let deferred3_1;
    try {
        const ptr0 = passArray8ToWasm0(public_key_bytes, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.hashPublicKey(ptr0, len0);
        var ptr2 = ret[0];
        var len2 = ret[1];
        if (ret[3]) {
            ptr2 = 0; len2 = 0;
            throw takeFromExternrefTable0(ret[2]);
        }
        deferred3_0 = ptr2;
        deferred3_1 = len2;
        return getStringFromWasm0(ptr2, len2);
    } finally {
        wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
    }
}

/**
 * Derive master key from seed bytes
 * @param {Uint8Array} seed
 * @returns {ExtendedKey}
 */
export function deriveMasterKey(seed) {
    const ptr0 = passArray8ToWasm0(seed, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.deriveMasterKey(ptr0, len0);
    return ExtendedKey.__wrap(ret);
}

/**
 * Verify a signature with a public key
 * @param {Uint8Array} public_key_bytes
 * @param {Signature} signature
 * @param {string} message
 * @returns {boolean}
 */
export function verifySignature(public_key_bytes, signature, message) {
    const ptr0 = passArray8ToWasm0(public_key_bytes, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(message, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.verifySignature(ptr0, len0, signature, ptr1, len1);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return ret[0] !== 0;
}

/**
 * Hash a u64 value
 * @param {bigint} value
 * @returns {string}
 */
export function hashU64(value) {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.hashU64(value);
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

/**
 * Hash a noun (jam as input)
 * @param {Uint8Array} noun
 * @returns {string}
 */
export function hashNoun(noun) {
    let deferred3_0;
    let deferred3_1;
    try {
        const ptr0 = passArray8ToWasm0(noun, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.hashNoun(ptr0, len0);
        var ptr2 = ret[0];
        var len2 = ret[1];
        if (ret[3]) {
            ptr2 = 0; len2 = 0;
            throw takeFromExternrefTable0(ret[2]);
        }
        deferred3_0 = ptr2;
        deferred3_1 = len2;
        return getStringFromWasm0(ptr2, len2);
    } finally {
        wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
    }
}

/**
 * Convert an Atom to belts.
 * @param {Noun} atom
 * @returns {Noun}
 */
export function atomToBelts(atom) {
    const ret = wasm.atomToBelts(atom);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * Convert string to an Atom.
 * @param {string} s
 * @returns {Noun}
 */
export function tas(s) {
    const ptr0 = passStringToWasm0(s, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.tas(ptr0, len0);
    return ret;
}

/**
 * Encode a Noun as a Uint8Array of bytes.
 * @param {Noun} noun
 * @returns {Uint8Array}
 */
export function jam(noun) {
    const ret = wasm.jam(noun);
    if (ret[3]) {
        throw takeFromExternrefTable0(ret[2]);
    }
    var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v1;
}

/**
 * Convert a sequence of belts back into one atom.
 * @param {Noun} noun
 * @returns {Noun}
 */
export function beltsToAtom(noun) {
    const ret = wasm.beltsToAtom(noun);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * Convert a string to sequence of Belts.
 *
 * This is equivalent to `atom_to_belts(tas(s))`.
 *
 * Belts are Atoms that fit the goldilocks prime field.
 *
 * If a transaction contains non-based (not-fitting) atoms, it will be rejected.
 * @param {string} s
 * @returns {Noun}
 */
export function tasBelts(s) {
    const ptr0 = passStringToWasm0(s, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.tasBelts(ptr0, len0);
    return ret;
}

/**
 * Cue a jammed Uint8Array into a Noun (see `jam`).
 * @param {Uint8Array} jam
 * @returns {Noun}
 */
export function cue(jam) {
    const ptr0 = passArray8ToWasm0(jam, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.cue(ptr0, len0);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * Convert an Atom into a string.
 * @param {Noun} noun
 * @returns {string}
 */
export function untas(noun) {
    let deferred2_0;
    let deferred2_1;
    try {
        const ret = wasm.untas(noun);
        var ptr1 = ret[0];
        var len1 = ret[1];
        if (ret[3]) {
            ptr1 = 0; len1 = 0;
            throw takeFromExternrefTable0(ret[2]);
        }
        deferred2_0 = ptr1;
        deferred2_1 = len1;
        return getStringFromWasm0(ptr1, len1);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}

function getArrayJsValueFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    const mem = getDataViewMemory0();
    const result = [];
    for (let i = ptr; i < ptr + 4 * len; i += 4) {
        result.push(wasm.__wbindgen_externrefs.get(mem.getUint32(i, true)));
    }
    wasm.__externref_drop_slice(ptr, len);
    return result;
}

function passArrayJsValueToWasm0(array, malloc) {
    const ptr = malloc(array.length * 4, 4) >>> 0;
    for (let i = 0; i < array.length; i++) {
        const add = addToExternrefTable0(array[i]);
        getDataViewMemory0().setUint32(ptr + 4 * i, add, true);
    }
    WASM_VECTOR_LEN = array.length;
    return ptr;
}

function _assertClass(instance, klass) {
    if (!(instance instanceof klass)) {
        throw new Error(`expected instance of ${klass.name}`);
    }
}
/**
 * @param {PbCom2RawTransaction} tx
 * @returns {RawTx}
 */
export function rawTxFromProtobuf(tx) {
    const ret = wasm.rawTxFromProtobuf(tx);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * Convert raw transaction into protobuf format.
 *
 * Protobuf format is the one used by the Nockchain's gRPC interface, and the initial iris
 * extension format. The new iris transaction signing API moves away from this format to use
 * `NockchainTx`, as it includes the necessary spend condition and note information.
 * @param {RawTxV1} tx
 * @returns {PbCom2RawTransaction}
 */
export function rawTxToProtobuf(tx) {
    const ret = wasm.rawTxToProtobuf(tx);
    return ret;
}

/**
 * Return default transaction engine settings for V1 Bythos signing.
 * @returns {TxEngineSettings}
 */
export function txEngineSettingsV1BythosDefault() {
    const ret = wasm.txEngineSettingsV1BythosDefault();
    return ret;
}

/**
 * Convert native SpendCondition to protobuf format.
 * Returns the protobuf format used by the Nockchain gRPC interface and external dApps.
 * @param {SpendCondition} value
 * @returns {PbCom2SpendCondition}
 */
export function spendConditionToProtobuf(value) {
    const ret = wasm.spendConditionToProtobuf(value);
    return ret;
}

/**
 * @param {Digest} d
 * @returns {PbCom1Hash}
 */
export function digestToProtobuf(d) {
    const ret = wasm.digestToProtobuf(d);
    return ret;
}

/**
 * @param {PbCom2Note} value
 * @returns {Note}
 */
export function noteFromProtobuf(value) {
    const ret = wasm.noteFromProtobuf(value);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * Return default transaction engine settings for V1 signing.
 * @returns {TxEngineSettings}
 */
export function txEngineSettingsV1Default() {
    const ret = wasm.txEngineSettingsV1Default();
    return ret;
}

/**
 * Convert protobuf spend condition to native SpendCondition.
 * Accepts the protobuf format used by the Nockchain gRPC interface and external dApps
 * @param {PbCom2SpendCondition} value
 * @returns {SpendCondition}
 */
export function spendConditionFromProtobuf(value) {
    const ret = wasm.spendConditionFromProtobuf(value);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * @param {Note} note
 * @returns {PbCom2Note}
 */
export function noteToProtobuf(note) {
    const ret = wasm.noteToProtobuf(note);
    return ret;
}

export function initPanicHook() {
    wasm.initPanicHook();
}

/**
 * @param {PbCom1Hash} value
 * @returns {Digest}
 */
export function digestFromProtobuf(value) {
    const ret = wasm.digestFromProtobuf(value);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * @param {SpendCondition[]} sps
 * @returns {Lock}
 */
export function lockFromList(sps) {
    const ptr0 = passArrayJsValueToWasm0(sps, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.lockFromList(ptr0, len0);
    return ret;
}

/**
 * @param {Lock} obj
 * @returns {number}
 */
export function lockHeight(obj) {
    const ret = wasm.lockHeight(obj);
    return ret >>> 0;
}

/**
 * @param {SpendCondition[]} sps
 * @returns {Lock}
 */
export function lockFromListBurnpad(sps) {
    const ptr0 = passArrayJsValueToWasm0(sps, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.lockFromListBurnpad(ptr0, len0);
    return ret;
}

/**
 * r" Convert into `Noun`.
 * @param {LockMetadata} v
 * @returns {Noun}
 */
export function lockMetadataToNoun(v) {
    const ret = wasm.lockMetadataToNoun(v);
    return ret;
}

/**
 * r" Convert from `Noun`.
 * @param {Noun} noun
 * @returns {LockMetadata}
 */
export function lockMetadataFromNoun(noun) {
    const ret = wasm.lockMetadataFromNoun(noun);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * @param {LockMetadata} v
 * @returns {Digest}
 */
export function lockMetadataHash(v) {
    const ret = wasm.lockMetadataHash(v);
    return ret;
}

/**
 * @param {Name} v
 * @returns {Digest}
 */
export function nameHash(v) {
    const ret = wasm.nameHash(v);
    return ret;
}

/**
 * r" Convert into `Noun`.
 * @param {Name} v
 * @returns {Noun}
 */
export function nameToNoun(v) {
    const ret = wasm.nameToNoun(v);
    return ret;
}

/**
 * r" Convert from `Noun`.
 * @param {Noun} noun
 * @returns {Name}
 */
export function nameFromNoun(noun) {
    const ret = wasm.nameFromNoun(noun);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * @returns {BlockchainConstants}
 */
export function blockchainConstantsMainnet() {
    const ret = wasm.blockchainConstantsMainnet();
    return ret;
}

/**
 * @param {LockTim} v
 * @returns {Digest}
 */
export function lockTimHash(v) {
    const ret = wasm.lockTimHash(v);
    return ret;
}

/**
 * r" Convert into `Noun`.
 * @param {LockTim} v
 * @returns {Noun}
 */
export function lockTimToNoun(v) {
    const ret = wasm.lockTimToNoun(v);
    return ret;
}

/**
 * r" Convert from `Noun`.
 * @param {Noun} noun
 * @returns {LockTim}
 */
export function lockTimFromNoun(noun) {
    const ret = wasm.lockTimFromNoun(noun);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * r" Convert into `Noun`.
 * @param {WitnessData} v
 * @returns {Noun}
 */
export function witnessDataToNoun(v) {
    const ret = wasm.witnessDataToNoun(v);
    return ret;
}

/**
 * r" Convert from `Noun`.
 * @param {Noun} noun
 * @returns {WitnessData}
 */
export function witnessDataFromNoun(noun) {
    const ret = wasm.witnessDataFromNoun(noun);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * r" Convert from `Noun`.
 * @param {Noun} noun
 * @returns {DisplayInput}
 */
export function displayInputFromNoun(noun) {
    const ret = wasm.displayInputFromNoun(noun);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * r" Convert into `Noun`.
 * @param {DisplayInput} v
 * @returns {Noun}
 */
export function displayInputToNoun(v) {
    const ret = wasm.displayInputToNoun(v);
    return ret;
}

/**
 * @param {LockMerkleProofFull} v
 * @returns {Digest}
 */
export function lockMerkleProofFullHash(v) {
    const ret = wasm.lockMerkleProofFullHash(v);
    return ret;
}

/**
 * r" Convert from `Noun`.
 * @param {Noun} noun
 * @returns {LockMerkleProofFull}
 */
export function lockMerkleProofFullFromNoun(noun) {
    const ret = wasm.lockMerkleProofFullFromNoun(noun);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * r" Convert into `Noun`.
 * @param {LockMerkleProofFull} v
 * @returns {Noun}
 */
export function lockMerkleProofFullToNoun(v) {
    const ret = wasm.lockMerkleProofFullToNoun(v);
    return ret;
}

/**
 * r" Convert into `Noun`.
 * @param {BasedNoun} v
 * @returns {Noun}
 */
export function basedNounToNoun(v) {
    const ret = wasm.basedNounToNoun(v);
    return ret;
}

/**
 * r" Convert from `Noun`.
 * @param {Noun} noun
 * @returns {BasedNoun}
 */
export function basedNounFromNoun(noun) {
    const ret = wasm.basedNounFromNoun(noun);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * @param {BasedNoun} v
 * @returns {Digest}
 */
export function basedNounHash(v) {
    const ret = wasm.basedNounHash(v);
    return ret;
}

/**
 * r" Convert into `Noun`.
 * @param {Hax} v
 * @returns {Noun}
 */
export function haxToNoun(v) {
    const ret = wasm.haxToNoun(v);
    return ret;
}

/**
 * @param {Hax} v
 * @returns {Digest}
 */
export function haxHash(v) {
    const ret = wasm.haxHash(v);
    return ret;
}

/**
 * r" Convert from `Noun`.
 * @param {Noun} noun
 * @returns {Hax}
 */
export function haxFromNoun(noun) {
    const ret = wasm.haxFromNoun(noun);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * r" Convert from `Noun`.
 * @param {Noun} noun
 * @returns {LockV4}
 */
export function lockV4FromNoun(noun) {
    const ret = wasm.lockV4FromNoun(noun);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * @param {LockV4} v
 * @returns {Digest}
 */
export function lockV4Hash(v) {
    const ret = wasm.lockV4Hash(v);
    return ret;
}

/**
 * r" Convert into `Noun`.
 * @param {LockV4} v
 * @returns {Noun}
 */
export function lockV4ToNoun(v) {
    const ret = wasm.lockV4ToNoun(v);
    return ret;
}

/**
 * r" Convert from `Noun`.
 * @param {Noun} noun
 * @returns {NoteData}
 */
export function noteDataFromNoun(noun) {
    const ret = wasm.noteDataFromNoun(noun);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * @param {NoteData} v
 * @returns {Digest}
 */
export function noteDataHash(v) {
    const ret = wasm.noteDataHash(v);
    return ret;
}

/**
 * r" Convert into `Noun`.
 * @param {NoteData} v
 * @returns {Noun}
 */
export function noteDataToNoun(v) {
    const ret = wasm.noteDataToNoun(v);
    return ret;
}

/**
 * @param {Pkh} pkh
 * @returns {NoteData}
 */
export function noteDataFromPkh(pkh) {
    const ret = wasm.noteDataFromPkh(pkh);
    return ret;
}

/**
 * @param {NoteData} obj
 * @returns {bigint}
 */
export function noteDataFeeWords(obj) {
    const ret = wasm.noteDataFeeWords(obj);
    return BigInt.asUintN(64, ret);
}

/**
 * @returns {NoteData}
 */
export function noteDataEmpty() {
    const ret = wasm.noteDataEmpty();
    return ret;
}

/**
 * r" Convert into `Noun`.
 * @param {LockPrimitive} v
 * @returns {Noun}
 */
export function lockPrimitiveToNoun(v) {
    const ret = wasm.lockPrimitiveToNoun(v);
    return ret;
}

/**
 * r" Convert from `Noun`.
 * @param {Noun} noun
 * @returns {LockPrimitive}
 */
export function lockPrimitiveFromNoun(noun) {
    const ret = wasm.lockPrimitiveFromNoun(noun);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * @param {LockPrimitive} v
 * @returns {Digest}
 */
export function lockPrimitiveHash(v) {
    const ret = wasm.lockPrimitiveHash(v);
    return ret;
}

/**
 * r" Convert into `Noun`.
 * @param {SpendCondition} v
 * @returns {Noun}
 */
export function spendConditionToNoun(v) {
    const ret = wasm.spendConditionToNoun(v);
    return ret;
}

/**
 * @param {SpendCondition} v
 * @returns {Digest}
 */
export function spendConditionHash(v) {
    const ret = wasm.spendConditionHash(v);
    return ret;
}

/**
 * r" Convert from `Noun`.
 * @param {Noun} noun
 * @returns {SpendCondition}
 */
export function spendConditionFromNoun(noun) {
    const ret = wasm.spendConditionFromNoun(noun);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * @param {Pkh} pkh
 * @returns {SpendCondition}
 */
export function spendConditionNewPkh(pkh) {
    const ret = wasm.spendConditionNewPkh(pkh);
    return ret;
}

/**
 * @param {SpendCondition} obj
 * @returns {Hax[]}
 */
export function spendConditionHax(obj) {
    const ret = wasm.spendConditionHax(obj);
    var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v1;
}

/**
 * @param {SpendCondition} obj
 * @returns {boolean}
 */
export function spendConditionBrn(obj) {
    const ret = wasm.spendConditionBrn(obj);
    return ret !== 0;
}

/**
 * @param {SpendCondition} obj
 * @returns {Pkh[]}
 */
export function spendConditionPkh(obj) {
    const ret = wasm.spendConditionPkh(obj);
    var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v1;
}

/**
 * @param {SpendCondition} obj
 * @returns {Digest}
 */
export function spendConditionFirstName(obj) {
    const ret = wasm.spendConditionFirstName(obj);
    return ret;
}

/**
 * @param {SpendCondition} obj
 * @returns {LockTim[]}
 */
export function spendConditionTim(obj) {
    const ret = wasm.spendConditionTim(obj);
    var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v1;
}

/**
 * @param {TimelockRange} v
 * @returns {Digest}
 */
export function timelockRangeHash(v) {
    const ret = wasm.timelockRangeHash(v);
    return ret;
}

/**
 * r" Convert from `Noun`.
 * @param {Noun} noun
 * @returns {TimelockRange}
 */
export function timelockRangeFromNoun(noun) {
    const ret = wasm.timelockRangeFromNoun(noun);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * r" Convert into `Noun`.
 * @param {TimelockRange} v
 * @returns {Noun}
 */
export function timelockRangeToNoun(v) {
    const ret = wasm.timelockRangeToNoun(v);
    return ret;
}

/**
 * r" Convert into `Noun`.
 * @param {TxV0} v
 * @returns {Noun}
 */
export function txV0ToNoun(v) {
    const ret = wasm.txV0ToNoun(v);
    return ret;
}

/**
 * r" Convert from `Noun`.
 * @param {Noun} noun
 * @returns {TxV0}
 */
export function txV0FromNoun(noun) {
    const ret = wasm.txV0FromNoun(noun);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * r" Convert into `Noun`.
 * @param {RawTxV0} v
 * @returns {Noun}
 */
export function rawTxV0ToNoun(v) {
    const ret = wasm.rawTxV0ToNoun(v);
    return ret;
}

/**
 * r" Convert from `Noun`.
 * @param {Noun} noun
 * @returns {RawTxV0}
 */
export function rawTxV0FromNoun(noun) {
    const ret = wasm.rawTxV0FromNoun(noun);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * @param {LockV2} v
 * @returns {Digest}
 */
export function lockV2Hash(v) {
    const ret = wasm.lockV2Hash(v);
    return ret;
}

/**
 * r" Convert into `Noun`.
 * @param {LockV2} v
 * @returns {Noun}
 */
export function lockV2ToNoun(v) {
    const ret = wasm.lockV2ToNoun(v);
    return ret;
}

/**
 * r" Convert from `Noun`.
 * @param {Noun} noun
 * @returns {LockV2}
 */
export function lockV2FromNoun(noun) {
    const ret = wasm.lockV2FromNoun(noun);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * @param {LockRoot} v
 * @returns {Digest}
 */
export function lockRootHash(v) {
    const ret = wasm.lockRootHash(v);
    return ret;
}

/**
 * r" Convert into `Noun`.
 * @param {LockRoot} v
 * @returns {Noun}
 */
export function lockRootToNoun(v) {
    const ret = wasm.lockRootToNoun(v);
    return ret;
}

/**
 * r" Convert from `Noun`.
 * @param {Noun} noun
 * @returns {LockRoot}
 */
export function lockRootFromNoun(noun) {
    const ret = wasm.lockRootFromNoun(noun);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * r" Convert from `Noun`.
 * @param {Noun} noun
 * @returns {InputDisplay}
 */
export function inputDisplayFromNoun(noun) {
    const ret = wasm.inputDisplayFromNoun(noun);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * r" Convert into `Noun`.
 * @param {InputDisplay} v
 * @returns {Noun}
 */
export function inputDisplayToNoun(v) {
    const ret = wasm.inputDisplayToNoun(v);
    return ret;
}

/**
 * r" Convert into `Noun`.
 * @param {TransactionDisplay} v
 * @returns {Noun}
 */
export function transactionDisplayToNoun(v) {
    const ret = wasm.transactionDisplayToNoun(v);
    return ret;
}

/**
 * r" Convert from `Noun`.
 * @param {Noun} noun
 * @returns {TransactionDisplay}
 */
export function transactionDisplayFromNoun(noun) {
    const ret = wasm.transactionDisplayFromNoun(noun);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * r" Convert into `Noun`.
 * @param {Source} v
 * @returns {Noun}
 */
export function sourceToNoun(v) {
    const ret = wasm.sourceToNoun(v);
    return ret;
}

/**
 * r" Convert from `Noun`.
 * @param {Noun} noun
 * @returns {Source}
 */
export function sourceFromNoun(noun) {
    const ret = wasm.sourceFromNoun(noun);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * @param {Source} v
 * @returns {Digest}
 */
export function sourceHash(v) {
    const ret = wasm.sourceHash(v);
    return ret;
}

/**
 * r" Convert from `Noun`.
 * @param {Noun} noun
 * @returns {Balance}
 */
export function balanceFromNoun(noun) {
    const ret = wasm.balanceFromNoun(noun);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * r" Convert into `Noun`.
 * @param {Balance} v
 * @returns {Noun}
 */
export function balanceToNoun(v) {
    const ret = wasm.balanceToNoun(v);
    return ret;
}

/**
 * r" Convert into `Noun`.
 * @param {BalanceUpdate} v
 * @returns {Noun}
 */
export function balanceUpdateToNoun(v) {
    const ret = wasm.balanceUpdateToNoun(v);
    return ret;
}

/**
 * r" Convert from `Noun`.
 * @param {Noun} noun
 * @returns {BalanceUpdate}
 */
export function balanceUpdateFromNoun(noun) {
    const ret = wasm.balanceUpdateFromNoun(noun);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * r" Convert into `Noun`.
 * @param {Sig} v
 * @returns {Noun}
 */
export function sigToNoun(v) {
    const ret = wasm.sigToNoun(v);
    return ret;
}

/**
 * r" Convert from `Noun`.
 * @param {Noun} noun
 * @returns {Sig}
 */
export function sigFromNoun(noun) {
    const ret = wasm.sigFromNoun(noun);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * @param {Sig} v
 * @returns {Digest}
 */
export function sigHash(v) {
    const ret = wasm.sigHash(v);
    return ret;
}

/**
 * @param {SpendV0} v
 * @returns {Digest}
 */
export function spendV0Hash(v) {
    const ret = wasm.spendV0Hash(v);
    return ret;
}

/**
 * r" Convert from `Noun`.
 * @param {Noun} noun
 * @returns {SpendV0}
 */
export function spendV0FromNoun(noun) {
    const ret = wasm.spendV0FromNoun(noun);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * r" Convert into `Noun`.
 * @param {SpendV0} v
 * @returns {Noun}
 */
export function spendV0ToNoun(v) {
    const ret = wasm.spendV0ToNoun(v);
    return ret;
}

/**
 * @param {Timelock} v
 * @returns {Digest}
 */
export function timelockHash(v) {
    const ret = wasm.timelockHash(v);
    return ret;
}

/**
 * r" Convert from `Noun`.
 * @param {Noun} noun
 * @returns {Timelock}
 */
export function timelockFromNoun(noun) {
    const ret = wasm.timelockFromNoun(noun);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * r" Convert into `Noun`.
 * @param {Timelock} v
 * @returns {Noun}
 */
export function timelockToNoun(v) {
    const ret = wasm.timelockToNoun(v);
    return ret;
}

/**
 * @param {OutputV0} v
 * @returns {Digest}
 */
export function outputV0Hash(v) {
    const ret = wasm.outputV0Hash(v);
    return ret;
}

/**
 * r" Convert into `Noun`.
 * @param {OutputV0} v
 * @returns {Noun}
 */
export function outputV0ToNoun(v) {
    const ret = wasm.outputV0ToNoun(v);
    return ret;
}

/**
 * r" Convert from `Noun`.
 * @param {Noun} noun
 * @returns {OutputV0}
 */
export function outputV0FromNoun(noun) {
    const ret = wasm.outputV0FromNoun(noun);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * r" Convert into `Noun`.
 * @param {TimelockIntent} v
 * @returns {Noun}
 */
export function timelockIntentToNoun(v) {
    const ret = wasm.timelockIntentToNoun(v);
    return ret;
}

/**
 * r" Convert from `Noun`.
 * @param {Noun} noun
 * @returns {TimelockIntent}
 */
export function timelockIntentFromNoun(noun) {
    const ret = wasm.timelockIntentFromNoun(noun);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * @param {TimelockIntent} v
 * @returns {Digest}
 */
export function timelockIntentHash(v) {
    const ret = wasm.timelockIntentHash(v);
    return ret;
}

/**
 * @param {Pkh} v
 * @returns {Digest}
 */
export function pkhHash(v) {
    const ret = wasm.pkhHash(v);
    return ret;
}

/**
 * r" Convert into `Noun`.
 * @param {Pkh} v
 * @returns {Noun}
 */
export function pkhToNoun(v) {
    const ret = wasm.pkhToNoun(v);
    return ret;
}

/**
 * r" Convert from `Noun`.
 * @param {Noun} noun
 * @returns {Pkh}
 */
export function pkhFromNoun(noun) {
    const ret = wasm.pkhFromNoun(noun);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * @param {bigint} m
 * @param {Digest[]} hashes
 * @returns {Pkh}
 */
export function pkhNew(m, hashes) {
    const ptr0 = passArrayJsValueToWasm0(hashes, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.pkhNew(m, ptr0, len0);
    return ret;
}

/**
 * @param {Digest} hash
 * @returns {Pkh}
 */
export function pkhSingle(hash) {
    const ret = wasm.pkhSingle(hash);
    return ret;
}

/**
 * r" Convert into `Noun`.
 * @param {NoteV1} v
 * @returns {Noun}
 */
export function noteV1ToNoun(v) {
    const ret = wasm.noteV1ToNoun(v);
    return ret;
}

/**
 * @param {NoteV1} v
 * @returns {Digest}
 */
export function noteV1Hash(v) {
    const ret = wasm.noteV1Hash(v);
    return ret;
}

/**
 * r" Convert from `Noun`.
 * @param {Noun} noun
 * @returns {NoteV1}
 */
export function noteV1FromNoun(noun) {
    const ret = wasm.noteV1FromNoun(noun);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * r" Convert from `Noun`.
 * @param {Noun} noun
 * @returns {SeedV1}
 */
export function seedV1FromNoun(noun) {
    const ret = wasm.seedV1FromNoun(noun);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * r" Convert into `Noun`.
 * @param {SeedV1} v
 * @returns {Noun}
 */
export function seedV1ToNoun(v) {
    const ret = wasm.seedV1ToNoun(v);
    return ret;
}

/**
 * @param {SeedV1} v
 * @returns {Digest}
 */
export function seedV1Hash(v) {
    const ret = wasm.seedV1Hash(v);
    return ret;
}

/**
 * @param {Digest} pkh
 * @param {Nicks} gift
 * @param {Digest} parent_hash
 * @param {boolean} include_lock_data
 * @returns {SeedV1}
 */
export function seedV1NewSinglePkh(pkh, gift, parent_hash, include_lock_data) {
    const ret = wasm.seedV1NewSinglePkh(pkh, gift, parent_hash, include_lock_data);
    return ret;
}

/**
 * @param {SeedV1} obj
 * @returns {bigint}
 */
export function seedV1NoteDataWords(obj) {
    const ret = wasm.seedV1NoteDataWords(obj);
    return BigInt.asUintN(64, ret);
}

/**
 * r" Convert from `Noun`.
 * @param {Noun} noun
 * @returns {PkhSignature}
 */
export function pkhSignatureFromNoun(noun) {
    const ret = wasm.pkhSignatureFromNoun(noun);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * @param {PkhSignature} v
 * @returns {Digest}
 */
export function pkhSignatureHash(v) {
    const ret = wasm.pkhSignatureHash(v);
    return ret;
}

/**
 * r" Convert into `Noun`.
 * @param {PkhSignature} v
 * @returns {Noun}
 */
export function pkhSignatureToNoun(v) {
    const ret = wasm.pkhSignatureToNoun(v);
    return ret;
}

/**
 * @param {LockMerkleProofStub} v
 * @returns {Digest}
 */
export function lockMerkleProofStubHash(v) {
    const ret = wasm.lockMerkleProofStubHash(v);
    return ret;
}

/**
 * r" Convert into `Noun`.
 * @param {LockMerkleProofStub} v
 * @returns {Noun}
 */
export function lockMerkleProofStubToNoun(v) {
    const ret = wasm.lockMerkleProofStubToNoun(v);
    return ret;
}

/**
 * r" Convert from `Noun`.
 * @param {Noun} noun
 * @returns {LockMerkleProofStub}
 */
export function lockMerkleProofStubFromNoun(noun) {
    const ret = wasm.lockMerkleProofStubFromNoun(noun);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * r" Convert from `Noun`.
 * @param {Noun} noun
 * @returns {SeedV0}
 */
export function seedV0FromNoun(noun) {
    const ret = wasm.seedV0FromNoun(noun);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * @param {SeedV0} v
 * @returns {Digest}
 */
export function seedV0Hash(v) {
    const ret = wasm.seedV0Hash(v);
    return ret;
}

/**
 * r" Convert into `Noun`.
 * @param {SeedV0} v
 * @returns {Noun}
 */
export function seedV0ToNoun(v) {
    const ret = wasm.seedV0ToNoun(v);
    return ret;
}

/**
 * r" Convert from `Noun`.
 * @param {Noun} noun
 * @returns {SeedsV0}
 */
export function seedsV0FromNoun(noun) {
    const ret = wasm.seedsV0FromNoun(noun);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * r" Convert into `Noun`.
 * @param {SeedsV0} v
 * @returns {Noun}
 */
export function seedsV0ToNoun(v) {
    const ret = wasm.seedsV0ToNoun(v);
    return ret;
}

/**
 * @param {SeedsV0} v
 * @returns {Digest}
 */
export function seedsV0Hash(v) {
    const ret = wasm.seedsV0Hash(v);
    return ret;
}

/**
 * r" Convert from `Noun`.
 * @param {Noun} noun
 * @returns {NoteInner}
 */
export function noteInnerFromNoun(noun) {
    const ret = wasm.noteInnerFromNoun(noun);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * r" Convert into `Noun`.
 * @param {NoteInner} v
 * @returns {Noun}
 */
export function noteInnerToNoun(v) {
    const ret = wasm.noteInnerToNoun(v);
    return ret;
}

/**
 * @param {NoteInner} v
 * @returns {Digest}
 */
export function noteInnerHash(v) {
    const ret = wasm.noteInnerHash(v);
    return ret;
}

/**
 * @param {LegacySignature} v
 * @returns {Digest}
 */
export function legacySignatureHash(v) {
    const ret = wasm.legacySignatureHash(v);
    return ret;
}

/**
 * r" Convert from `Noun`.
 * @param {Noun} noun
 * @returns {LegacySignature}
 */
export function legacySignatureFromNoun(noun) {
    const ret = wasm.legacySignatureFromNoun(noun);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * r" Convert into `Noun`.
 * @param {LegacySignature} v
 * @returns {Noun}
 */
export function legacySignatureToNoun(v) {
    const ret = wasm.legacySignatureToNoun(v);
    return ret;
}

/**
 * r" Convert into `Noun`.
 * @param {LockV8} v
 * @returns {Noun}
 */
export function lockV8ToNoun(v) {
    const ret = wasm.lockV8ToNoun(v);
    return ret;
}

/**
 * @param {LockV8} v
 * @returns {Digest}
 */
export function lockV8Hash(v) {
    const ret = wasm.lockV8Hash(v);
    return ret;
}

/**
 * r" Convert from `Noun`.
 * @param {Noun} noun
 * @returns {LockV8}
 */
export function lockV8FromNoun(noun) {
    const ret = wasm.lockV8FromNoun(noun);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * r" Convert from `Noun`.
 * @param {Noun} noun
 * @returns {Witness}
 */
export function witnessFromNoun(noun) {
    const ret = wasm.witnessFromNoun(noun);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * r" Convert into `Noun`.
 * @param {Witness} v
 * @returns {Noun}
 */
export function witnessToNoun(v) {
    const ret = wasm.witnessToNoun(v);
    return ret;
}

/**
 * @param {Witness} v
 * @returns {Digest}
 */
export function witnessHash(v) {
    const ret = wasm.witnessHash(v);
    return ret;
}

/**
 * r" Convert from `Noun`.
 * @param {Noun} noun
 * @returns {OutputV1}
 */
export function outputV1FromNoun(noun) {
    const ret = wasm.outputV1FromNoun(noun);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * r" Convert into `Noun`.
 * @param {OutputV1} v
 * @returns {Noun}
 */
export function outputV1ToNoun(v) {
    const ret = wasm.outputV1ToNoun(v);
    return ret;
}

/**
 * @param {OutputV1} v
 * @returns {Digest}
 */
export function outputV1Hash(v) {
    const ret = wasm.outputV1Hash(v);
    return ret;
}

/**
 * @param {Spend1V1} obj
 * @returns {Digest}
 */
export function spend1V1SigHash(obj) {
    const ret = wasm.spend1V1SigHash(obj);
    return ret;
}

/**
 * r" Convert into `Noun`.
 * @param {LockMerkleProof} v
 * @returns {Noun}
 */
export function lockMerkleProofToNoun(v) {
    const ret = wasm.lockMerkleProofToNoun(v);
    return ret;
}

/**
 * r" Convert from `Noun`.
 * @param {Noun} noun
 * @returns {LockMerkleProof}
 */
export function lockMerkleProofFromNoun(noun) {
    const ret = wasm.lockMerkleProofFromNoun(noun);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * @param {LockMerkleProof} v
 * @returns {Digest}
 */
export function lockMerkleProofHash(v) {
    const ret = wasm.lockMerkleProofHash(v);
    return ret;
}

/**
 * r" Convert from `Noun`.
 * @param {Noun} noun
 * @returns {Tx}
 */
export function txFromNoun(noun) {
    const ret = wasm.txFromNoun(noun);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * r" Convert into `Noun`.
 * @param {Tx} v
 * @returns {Noun}
 */
export function txToNoun(v) {
    const ret = wasm.txToNoun(v);
    return ret;
}

/**
 * r" Create a 0-indexed merkle proof for the type's subleaf.
 * r"
 * r" Note that unlike `prove-hashable-by-index:merkle`, which is 1-indexed, this method is 0-indexed.
 * @param {Page} v
 * @param {number} leaf_index
 * @returns {MerkleProvenAxis}
 */
export function pageProve(v, leaf_index) {
    const ret = wasm.pageProve(v, leaf_index);
    return ret;
}

/**
 * @param {Page} v
 * @returns {Digest}
 */
export function pageHash(v) {
    const ret = wasm.pageHash(v);
    return ret;
}

/**
 * r" Convert from `Noun`.
 * @param {Noun} noun
 * @returns {Page}
 */
export function pageFromNoun(noun) {
    const ret = wasm.pageFromNoun(noun);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * r" Convert into `Noun`.
 * @param {Page} v
 * @returns {Noun}
 */
export function pageToNoun(v) {
    const ret = wasm.pageToNoun(v);
    return ret;
}

/**
 * r" Convert into `Noun`.
 * @param {RawTx} v
 * @returns {Noun}
 */
export function rawTxToNoun(v) {
    const ret = wasm.rawTxToNoun(v);
    return ret;
}

/**
 * r" Convert from `Noun`.
 * @param {Noun} noun
 * @returns {RawTx}
 */
export function rawTxFromNoun(noun) {
    const ret = wasm.rawTxFromNoun(noun);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * Compute coinbase notes of this block
 * @param {Page} obj
 * @param {BlockchainConstants} consts
 * @returns {Note[]}
 */
export function pageCoinbase(obj, consts) {
    const ret = wasm.pageCoinbase(obj, consts);
    var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v1;
}

/**
 * @param {Page} obj
 * @returns {Digest}
 */
export function pageBlockCommitment(obj) {
    const ret = wasm.pageBlockCommitment(obj);
    return ret;
}

/**
 * @param {RawTx} obj
 * @returns {Version}
 */
export function rawTxVersion(obj) {
    const ret = wasm.rawTxVersion(obj);
    return ret;
}

/**
 * @param {RawTx} obj
 * @returns {Digest}
 */
export function rawTxId(obj) {
    const ret = wasm.rawTxId(obj);
    return ret;
}

/**
 * Returns the spend conditions for each input.
 * For V0 transactions, this is always None.
 * @param {RawTx} obj
 * @returns {SpendCondition[]}
 */
export function rawTxInputSpendConditions(obj) {
    const ret = wasm.rawTxInputSpendConditions(obj);
    var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v1;
}

/**
 * @param {RawTx} obj
 * @returns {Name[]}
 */
export function rawTxInputNames(obj) {
    const ret = wasm.rawTxInputNames(obj);
    var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v1;
}

/**
 * @param {RawTx} obj
 * @returns {Nicks}
 */
export function rawTxTotalFees(obj) {
    const ret = wasm.rawTxTotalFees(obj);
    return ret;
}

/**
 * @param {RawTx} obj
 * @param {number} block_height
 * @param {TxEngineSettings} tx_engine_settings
 * @returns {Note[]}
 */
export function rawTxOutputs(obj, block_height, tx_engine_settings) {
    const ret = wasm.rawTxOutputs(obj, block_height, tx_engine_settings);
    var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v1;
}

/**
 * @param {Input} v
 * @returns {Digest}
 */
export function inputHash(v) {
    const ret = wasm.inputHash(v);
    return ret;
}

/**
 * r" Convert into `Noun`.
 * @param {Input} v
 * @returns {Noun}
 */
export function inputToNoun(v) {
    const ret = wasm.inputToNoun(v);
    return ret;
}

/**
 * r" Convert from `Noun`.
 * @param {Noun} noun
 * @returns {Input}
 */
export function inputFromNoun(noun) {
    const ret = wasm.inputFromNoun(noun);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * r" Convert into `Noun`.
 * @param {Inputs} v
 * @returns {Noun}
 */
export function inputsToNoun(v) {
    const ret = wasm.inputsToNoun(v);
    return ret;
}

/**
 * @param {Inputs} v
 * @returns {Digest}
 */
export function inputsHash(v) {
    const ret = wasm.inputsHash(v);
    return ret;
}

/**
 * r" Convert from `Noun`.
 * @param {Noun} noun
 * @returns {Inputs}
 */
export function inputsFromNoun(noun) {
    const ret = wasm.inputsFromNoun(noun);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * r" Convert into `Noun`.
 * @param {NoteV0} v
 * @returns {Noun}
 */
export function noteV0ToNoun(v) {
    const ret = wasm.noteV0ToNoun(v);
    return ret;
}

/**
 * r" Convert from `Noun`.
 * @param {Noun} noun
 * @returns {NoteV0}
 */
export function noteV0FromNoun(noun) {
    const ret = wasm.noteV0FromNoun(noun);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * @param {NoteV0} v
 * @returns {Digest}
 */
export function noteV0Hash(v) {
    const ret = wasm.noteV0Hash(v);
    return ret;
}

/**
 * @param {PageMsg} v
 * @returns {Digest}
 */
export function pageMsgHash(v) {
    const ret = wasm.pageMsgHash(v);
    return ret;
}

/**
 * r" Convert into `Noun`.
 * @param {PageMsg} v
 * @returns {Noun}
 */
export function pageMsgToNoun(v) {
    const ret = wasm.pageMsgToNoun(v);
    return ret;
}

/**
 * r" Convert from `Noun`.
 * @param {Noun} noun
 * @returns {PageMsg}
 */
export function pageMsgFromNoun(noun) {
    const ret = wasm.pageMsgFromNoun(noun);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * r" Convert from `Noun`.
 * @param {Noun} noun
 * @returns {OutputsV0}
 */
export function outputsV0FromNoun(noun) {
    const ret = wasm.outputsV0FromNoun(noun);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * @param {OutputsV0} v
 * @returns {Digest}
 */
export function outputsV0Hash(v) {
    const ret = wasm.outputsV0Hash(v);
    return ret;
}

/**
 * r" Convert into `Noun`.
 * @param {OutputsV0} v
 * @returns {Noun}
 */
export function outputsV0ToNoun(v) {
    const ret = wasm.outputsV0ToNoun(v);
    return ret;
}

/**
 * r" Convert from `Noun`.
 * @param {Noun} noun
 * @returns {ChainTimestamp}
 */
export function chainTimestampFromNoun(noun) {
    const ret = wasm.chainTimestampFromNoun(noun);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * r" Convert into `Noun`.
 * @param {ChainTimestamp} v
 * @returns {Noun}
 */
export function chainTimestampToNoun(v) {
    const ret = wasm.chainTimestampToNoun(v);
    return ret;
}

/**
 * @param {ChainTimestamp} v
 * @returns {Digest}
 */
export function chainTimestampHash(v) {
    const ret = wasm.chainTimestampHash(v);
    return ret;
}

/**
 * r" Convert into `Noun`.
 * @param {CoinbaseSplitV0} v
 * @returns {Noun}
 */
export function coinbaseSplitV0ToNoun(v) {
    const ret = wasm.coinbaseSplitV0ToNoun(v);
    return ret;
}

/**
 * @param {CoinbaseSplitV0} v
 * @returns {Digest}
 */
export function coinbaseSplitV0Hash(v) {
    const ret = wasm.coinbaseSplitV0Hash(v);
    return ret;
}

/**
 * r" Convert from `Noun`.
 * @param {Noun} noun
 * @returns {CoinbaseSplitV0}
 */
export function coinbaseSplitV0FromNoun(noun) {
    const ret = wasm.coinbaseSplitV0FromNoun(noun);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * r" Create a 0-indexed merkle proof for the type's subleaf.
 * r"
 * r" Note that unlike `prove-hashable-by-index:merkle`, which is 1-indexed, this method is 0-indexed.
 * @param {Lock} v
 * @param {number} leaf_index
 * @returns {MerkleProvenAxis}
 */
export function lockProve(v, leaf_index) {
    const ret = wasm.lockProve(v, leaf_index);
    return ret;
}

/**
 * r" Convert into `Noun`.
 * @param {Lock} v
 * @returns {Noun}
 */
export function lockToNoun(v) {
    const ret = wasm.lockToNoun(v);
    return ret;
}

/**
 * r" Convert from `Noun`.
 * @param {Noun} noun
 * @returns {Lock}
 */
export function lockFromNoun(noun) {
    const ret = wasm.lockFromNoun(noun);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * @param {Lock} v
 * @returns {Digest}
 */
export function lockHash(v) {
    const ret = wasm.lockHash(v);
    return ret;
}

/**
 * r" Convert into `Noun`.
 * @param {TxV1} v
 * @returns {Noun}
 */
export function txV1ToNoun(v) {
    const ret = wasm.txV1ToNoun(v);
    return ret;
}

/**
 * r" Convert from `Noun`.
 * @param {Noun} noun
 * @returns {TxV1}
 */
export function txV1FromNoun(noun) {
    const ret = wasm.txV1FromNoun(noun);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * r" Convert from `Noun`.
 * @param {Noun} noun
 * @returns {LockV16}
 */
export function lockV16FromNoun(noun) {
    const ret = wasm.lockV16FromNoun(noun);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * @param {LockV16} v
 * @returns {Digest}
 */
export function lockV16Hash(v) {
    const ret = wasm.lockV16Hash(v);
    return ret;
}

/**
 * r" Convert into `Noun`.
 * @param {LockV16} v
 * @returns {Noun}
 */
export function lockV16ToNoun(v) {
    const ret = wasm.lockV16ToNoun(v);
    return ret;
}

/**
 * r" Convert from `Noun`.
 * @param {Noun} noun
 * @returns {SeedsV1}
 */
export function seedsV1FromNoun(noun) {
    const ret = wasm.seedsV1FromNoun(noun);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * r" Convert into `Noun`.
 * @param {SeedsV1} v
 * @returns {Noun}
 */
export function seedsV1ToNoun(v) {
    const ret = wasm.seedsV1ToNoun(v);
    return ret;
}

/**
 * @param {SeedsV1} v
 * @returns {Digest}
 */
export function seedsV1Hash(v) {
    const ret = wasm.seedsV1Hash(v);
    return ret;
}

/**
 * r" Convert into `Noun`.
 * @param {SpendV1} v
 * @returns {Noun}
 */
export function spendV1ToNoun(v) {
    const ret = wasm.spendV1ToNoun(v);
    return ret;
}

/**
 * r" Convert from `Noun`.
 * @param {Noun} noun
 * @returns {SpendV1}
 */
export function spendV1FromNoun(noun) {
    const ret = wasm.spendV1FromNoun(noun);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * r" Convert from `Noun`.
 * @param {Noun} noun
 * @returns {RawTxV1}
 */
export function rawTxV1FromNoun(noun) {
    const ret = wasm.rawTxV1FromNoun(noun);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * r" Convert into `Noun`.
 * @param {RawTxV1} v
 * @returns {Noun}
 */
export function rawTxV1ToNoun(v) {
    const ret = wasm.rawTxV1ToNoun(v);
    return ret;
}

/**
 * r" Convert from `Noun`.
 * @param {Noun} noun
 * @returns {SpendsV1}
 */
export function spendsV1FromNoun(noun) {
    const ret = wasm.spendsV1FromNoun(noun);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * @param {SpendsV1} v
 * @returns {Digest}
 */
export function spendsV1Hash(v) {
    const ret = wasm.spendsV1Hash(v);
    return ret;
}

/**
 * r" Convert into `Noun`.
 * @param {SpendsV1} v
 * @returns {Noun}
 */
export function spendsV1ToNoun(v) {
    const ret = wasm.spendsV1ToNoun(v);
    return ret;
}

/**
 * @param {OutputsV1} v
 * @returns {Digest}
 */
export function outputsV1Hash(v) {
    const ret = wasm.outputsV1Hash(v);
    return ret;
}

/**
 * r" Convert from `Noun`.
 * @param {Noun} noun
 * @returns {OutputsV1}
 */
export function outputsV1FromNoun(noun) {
    const ret = wasm.outputsV1FromNoun(noun);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * r" Convert into `Noun`.
 * @param {OutputsV1} v
 * @returns {Noun}
 */
export function outputsV1ToNoun(v) {
    const ret = wasm.outputsV1ToNoun(v);
    return ret;
}

/**
 * @param {SpendV1} obj
 * @returns {Digest}
 */
export function spendV1SigHash(obj) {
    const ret = wasm.spendV1SigHash(obj);
    return ret;
}

/**
 * @param {SpendV1} obj
 * @param {TxEngineSettings} settings
 * @returns {Nicks}
 */
export function spendV1UnclampedFee(obj, settings) {
    const ret = wasm.spendV1UnclampedFee(obj, settings);
    return ret;
}

/**
 * @param {SeedsV1} seeds
 * @param {Nicks} fee
 * @returns {SpendV1}
 */
export function spendV1NewLegacy(seeds, fee) {
    const ret = wasm.spendV1NewLegacy(seeds, fee);
    return ret;
}

/**
 * @param {SpendV1} obj
 * @returns {SeedsV1}
 */
export function spendV1Seeds(obj) {
    const ret = wasm.spendV1Seeds(obj);
    return ret;
}

/**
 * @param {Witness} witness
 * @param {SeedsV1} seeds
 * @param {Nicks} fee
 * @returns {SpendV1}
 */
export function spendV1NewWitness(witness, seeds, fee) {
    const ret = wasm.spendV1NewWitness(witness, seeds, fee);
    return ret;
}

/**
 * @param {SpendV1} obj
 * @returns {Nicks}
 */
export function spendV1TotalGifts(obj) {
    const ret = wasm.spendV1TotalGifts(obj);
    return ret;
}

/**
 * @param {SpendV1} obj
 * @returns {Nicks}
 */
export function spendV1Fee(obj) {
    const ret = wasm.spendV1Fee(obj);
    return ret;
}

/**
 * r" Convert into `Noun`.
 * @param {NockchainTx} v
 * @returns {Noun}
 */
export function nockchainTxToNoun(v) {
    const ret = wasm.nockchainTxToNoun(v);
    return ret;
}

/**
 * r" Convert from `Noun`.
 * @param {Noun} noun
 * @returns {NockchainTx}
 */
export function nockchainTxFromNoun(noun) {
    const ret = wasm.nockchainTxFromNoun(noun);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * @param {SpendsV1} spends
 * @returns {RawTxV1}
 */
export function rawTxV1New(spends) {
    const ret = wasm.rawTxV1New(spends);
    return ret;
}

/**
 * @param {RawTxV1} obj
 * @returns {Version}
 */
export function rawTxV1Version(obj) {
    const ret = wasm.rawTxV1Version(obj);
    return ret;
}

/**
 * @param {RawTxV1} obj
 * @returns {NockchainTx}
 */
export function rawTxV1ToNockchainTx(obj) {
    const ret = wasm.rawTxV1ToNockchainTx(obj);
    return ret;
}

/**
 * @param {RawTxV1} obj
 * @returns {Digest}
 */
export function rawTxV1CalcId(obj) {
    const ret = wasm.rawTxV1CalcId(obj);
    return ret;
}

/**
 * @param {RawTxV1} obj
 * @returns {SpendCondition[]}
 */
export function rawTxV1InputSpendConditions(obj) {
    const ret = wasm.rawTxV1InputSpendConditions(obj);
    var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v1;
}

/**
 * @param {RawTxV1} obj
 * @returns {Name[]}
 */
export function rawTxV1InputNames(obj) {
    const ret = wasm.rawTxV1InputNames(obj);
    var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v1;
}

/**
 * Calculate output notes from the transaction spends.
 *
 * This function combines seeds across multiple spends into one output note per-lock-root.
 * @param {RawTxV1} obj
 * @param {number} origin_page
 * @param {TxEngineSettings} tx_engine_settings
 * @returns {NoteV1[]}
 */
export function rawTxV1Outputs(obj, origin_page, tx_engine_settings) {
    const ret = wasm.rawTxV1Outputs(obj, origin_page, tx_engine_settings);
    var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v1;
}

/**
 * @param {SpendsV1} obj
 * @param {WitnessData} witness_data
 * @returns {SpendsV1}
 */
export function spendsV1ApplyWitness(obj, witness_data) {
    const ret = wasm.spendsV1ApplyWitness(obj, witness_data);
    return ret;
}

/**
 * @param {SpendsV1} obj
 * @param {TxEngineSettings} settings
 * @returns {Nicks}
 */
export function spendsV1UnclampedFee(obj, settings) {
    const ret = wasm.spendsV1UnclampedFee(obj, settings);
    return ret;
}

/**
 * @param {SpendsV1} obj
 * @returns {Nicks}
 */
export function spendsV1TotalFees(obj) {
    const ret = wasm.spendsV1TotalFees(obj);
    return ret;
}

/**
 * @param {SpendsV1} obj
 * @returns {Nicks}
 */
export function spendsV1TotalGifts(obj) {
    const ret = wasm.spendsV1TotalGifts(obj);
    return ret;
}

/**
 * @param {SpendsV1} obj
 * @param {TxEngineSettings} settings
 * @returns {Nicks}
 */
export function spendsV1Fee(obj, settings) {
    const ret = wasm.spendsV1Fee(obj, settings);
    return ret;
}

/**
 * @param {NockchainTx} obj
 * @returns {RawTxV1}
 */
export function nockchainTxToRawTx(obj) {
    const ret = wasm.nockchainTxToRawTx(obj);
    return ret;
}

/**
 * @param {NockchainTx} obj
 * @param {number} origin_page
 * @param {TxEngineSettings} tx_engine_settings
 * @returns {NoteV1[]}
 */
export function nockchainTxOutputs(obj, origin_page, tx_engine_settings) {
    const ret = wasm.nockchainTxOutputs(obj, origin_page, tx_engine_settings);
    var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v1;
}

/**
 * r" Convert into `Noun`.
 * @param {CoinbaseSplitV1} v
 * @returns {Noun}
 */
export function coinbaseSplitV1ToNoun(v) {
    const ret = wasm.coinbaseSplitV1ToNoun(v);
    return ret;
}

/**
 * @param {CoinbaseSplitV1} v
 * @returns {Digest}
 */
export function coinbaseSplitV1Hash(v) {
    const ret = wasm.coinbaseSplitV1Hash(v);
    return ret;
}

/**
 * r" Convert from `Noun`.
 * @param {Noun} noun
 * @returns {CoinbaseSplitV1}
 */
export function coinbaseSplitV1FromNoun(noun) {
    const ret = wasm.coinbaseSplitV1FromNoun(noun);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * r" Convert into `Noun`.
 * @param {Note} v
 * @returns {Noun}
 */
export function noteToNoun(v) {
    const ret = wasm.noteToNoun(v);
    return ret;
}

/**
 * r" Convert from `Noun`.
 * @param {Noun} noun
 * @returns {Note}
 */
export function noteFromNoun(noun) {
    const ret = wasm.noteFromNoun(noun);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * @param {Note} v
 * @returns {Digest}
 */
export function noteHash(v) {
    const ret = wasm.noteHash(v);
    return ret;
}

/**
 * r" Convert into `Noun`.
 * @param {Version} v
 * @returns {Noun}
 */
export function versionToNoun(v) {
    const ret = wasm.versionToNoun(v);
    return ret;
}

/**
 * r" Convert from `Noun`.
 * @param {Noun} noun
 * @returns {Version}
 */
export function versionFromNoun(noun) {
    const ret = wasm.versionFromNoun(noun);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * @param {Version} v
 * @returns {Digest}
 */
export function versionHash(v) {
    const ret = wasm.versionHash(v);
    return ret;
}

/**
 * r" Convert into `Noun`.
 * @param {Signature} v
 * @returns {Noun}
 */
export function signatureToNoun(v) {
    const ret = wasm.signatureToNoun(v);
    return ret;
}

/**
 * r" Convert from `Noun`.
 * @param {Noun} noun
 * @returns {Signature}
 */
export function signatureFromNoun(noun) {
    const ret = wasm.signatureFromNoun(noun);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * @param {Signature} v
 * @returns {Digest}
 */
export function signatureHash(v) {
    const ret = wasm.signatureHash(v);
    return ret;
}

/**
 * @param {Uint8Array} bytes
 * @returns {PublicKey}
 */
export function publicKeyFromBeBytes(bytes) {
    const ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.publicKeyFromBeBytes(ptr0, len0);
    return ret;
}

/**
 * @param {string} hex
 * @returns {PublicKey | undefined}
 */
export function publicKeyFromHex(hex) {
    const ptr0 = passStringToWasm0(hex, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.publicKeyFromHex(ptr0, len0);
    return ret;
}

/**
 * @param {PublicKey} obj
 * @param {Digest} m
 * @param {Signature} sig
 * @returns {boolean}
 */
export function publicKeyVerify(obj, m, sig) {
    const ret = wasm.publicKeyVerify(obj, m, sig);
    return ret !== 0;
}

/**
 * @param {PublicKey} obj
 * @returns {string}
 */
export function publicKeyToHex(obj) {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.publicKeyToHex(obj);
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

/**
 * @param {PublicKey} obj
 * @returns {Uint8Array}
 */
export function publicKeyToBeBytesVec(obj) {
    const ret = wasm.publicKeyToBeBytesVec(obj);
    var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v1;
}

/**
 * r" Convert into `Noun`.
 * @param {PublicKey} v
 * @returns {Noun}
 */
export function publicKeyToNoun(v) {
    const ret = wasm.publicKeyToNoun(v);
    return ret;
}

/**
 * r" Convert from `Noun`.
 * @param {Noun} noun
 * @returns {PublicKey}
 */
export function publicKeyFromNoun(noun) {
    const ret = wasm.publicKeyFromNoun(noun);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * @param {PublicKey} v
 * @returns {Digest}
 */
export function publicKeyHash(v) {
    const ret = wasm.publicKeyHash(v);
    return ret;
}

/**
 * r" Convert from `Noun`.
 * @param {Noun} noun
 * @returns {Bignum}
 */
export function bignumFromNoun(noun) {
    const ret = wasm.bignumFromNoun(noun);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * @param {Bignum} v
 * @returns {Digest}
 */
export function bignumHash(v) {
    const ret = wasm.bignumHash(v);
    return ret;
}

/**
 * r" Convert into `Noun`.
 * @param {Bignum} v
 * @returns {Noun}
 */
export function bignumToNoun(v) {
    const ret = wasm.bignumToNoun(v);
    return ret;
}

/**
 * @param {MerkleProvenAxis} v
 * @returns {Digest}
 */
export function merkleProvenAxisHash(v) {
    const ret = wasm.merkleProvenAxisHash(v);
    return ret;
}

/**
 * r" Convert from `Noun`.
 * @param {Noun} noun
 * @returns {MerkleProvenAxis}
 */
export function merkleProvenAxisFromNoun(noun) {
    const ret = wasm.merkleProvenAxisFromNoun(noun);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * r" Convert into `Noun`.
 * @param {MerkleProvenAxis} v
 * @returns {Noun}
 */
export function merkleProvenAxisToNoun(v) {
    const ret = wasm.merkleProvenAxisToNoun(v);
    return ret;
}

/**
 * r" Convert from `Noun`.
 * @param {Noun} noun
 * @returns {Digest}
 */
export function digestFromNoun(noun) {
    const ret = wasm.digestFromNoun(noun);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * @param {Digest} v
 * @returns {Digest}
 */
export function digestHash(v) {
    const ret = wasm.digestHash(v);
    return ret;
}

/**
 * r" Convert into `Noun`.
 * @param {Digest} v
 * @returns {Noun}
 */
export function digestToNoun(v) {
    const ret = wasm.digestToNoun(v);
    return ret;
}

/**
 * @param {Noun} atom
 * @returns {Digest}
 */
export function digestFromAtom(atom) {
    const ret = wasm.digestFromAtom(atom);
    return ret;
}

/**
 * @param {Digest} obj
 * @returns {Noun}
 */
export function digestToAtom(obj) {
    const ret = wasm.digestToAtom(obj);
    return ret;
}

/**
 * r" Convert from `Noun`.
 * @param {Noun} noun
 * @returns {MerkleProof}
 */
export function merkleProofFromNoun(noun) {
    const ret = wasm.merkleProofFromNoun(noun);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * @param {MerkleProof} v
 * @returns {Digest}
 */
export function merkleProofHash(v) {
    const ret = wasm.merkleProofHash(v);
    return ret;
}

/**
 * r" Convert into `Noun`.
 * @param {MerkleProof} v
 * @returns {Noun}
 */
export function merkleProofToNoun(v) {
    const ret = wasm.merkleProofToNoun(v);
    return ret;
}

function wasm_bindgen__convert__closures_____invoke__h7f888ae473d7b77e(arg0, arg1, arg2) {
    wasm.wasm_bindgen__convert__closures_____invoke__h7f888ae473d7b77e(arg0, arg1, arg2);
}

function wasm_bindgen__convert__closures_____invoke__h326fdb3bcde44ceb(arg0, arg1, arg2, arg3) {
    wasm.wasm_bindgen__convert__closures_____invoke__h326fdb3bcde44ceb(arg0, arg1, arg2, arg3);
}

const __wbindgen_enum_ReadableStreamType = ["bytes"];

const __wbindgen_enum_ReferrerPolicy = ["", "no-referrer", "no-referrer-when-downgrade", "origin", "origin-when-cross-origin", "unsafe-url", "same-origin", "strict-origin", "strict-origin-when-cross-origin"];

const __wbindgen_enum_RequestCache = ["default", "no-store", "reload", "no-cache", "force-cache", "only-if-cached"];

const __wbindgen_enum_RequestCredentials = ["omit", "same-origin", "include"];

const __wbindgen_enum_RequestMode = ["same-origin", "no-cors", "cors", "navigate"];

const __wbindgen_enum_RequestRedirect = ["follow", "error", "manual"];

const ExtendedKeyFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_extendedkey_free(ptr >>> 0, 1));

export class ExtendedKey {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(ExtendedKey.prototype);
        obj.__wbg_ptr = ptr;
        ExtendedKeyFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        ExtendedKeyFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_extendedkey_free(ptr, 0);
    }
    /**
     * @returns {Uint8Array}
     */
    get chainCode() {
        const ret = wasm.extendedkey_chainCode(this.__wbg_ptr);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
    /**
     * @returns {Uint8Array}
     */
    get publicKey() {
        const ret = wasm.extendedkey_publicKey(this.__wbg_ptr);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
    /**
     * @returns {Uint8Array | undefined}
     */
    get privateKey() {
        const ret = wasm.extendedkey_privateKey(this.__wbg_ptr);
        let v1;
        if (ret[0] !== 0) {
            v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
            wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        }
        return v1;
    }
    /**
     * Derive a child key at the given index
     * @param {number} index
     * @returns {ExtendedKey}
     */
    deriveChild(index) {
        const ret = wasm.extendedkey_deriveChild(this.__wbg_ptr, index);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return ExtendedKey.__wrap(ret[0]);
    }
}
if (Symbol.dispose) ExtendedKey.prototype[Symbol.dispose] = ExtendedKey.prototype.free;

const GrpcClientFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_grpcclient_free(ptr >>> 0, 1));

export class GrpcClient {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        GrpcClientFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_grpcclient_free(ptr, 0);
    }
    /**
     * Send a transaction
     * @param {PbCom2RawTransaction} raw_tx
     * @returns {Promise<string>}
     */
    sendTransaction(raw_tx) {
        const ret = wasm.grpcclient_sendTransaction(this.__wbg_ptr, raw_tx);
        return ret;
    }
    /**
     * Check if a transaction was accepted
     * @param {string} tx_id
     * @returns {Promise<boolean>}
     */
    transactionAccepted(tx_id) {
        const ptr0 = passStringToWasm0(tx_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.grpcclient_transactionAccepted(this.__wbg_ptr, ptr0, len0);
        return ret;
    }
    /**
     * Get balance for a wallet address
     * @param {string} address
     * @returns {Promise<PbCom2Balance>}
     */
    getBalanceByAddress(address) {
        const ptr0 = passStringToWasm0(address, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.grpcclient_getBalanceByAddress(this.__wbg_ptr, ptr0, len0);
        return ret;
    }
    /**
     * Get balance for a first name
     * @param {string} first_name
     * @returns {Promise<PbCom2Balance>}
     */
    getBalanceByFirstName(first_name) {
        const ptr0 = passStringToWasm0(first_name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.grpcclient_getBalanceByFirstName(this.__wbg_ptr, ptr0, len0);
        return ret;
    }
    /**
     * @param {string} endpoint
     */
    constructor(endpoint) {
        const ptr0 = passStringToWasm0(endpoint, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.grpcclient_new(ptr0, len0);
        this.__wbg_ptr = ret >>> 0;
        GrpcClientFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Peek a value from a Nock application
     * @param {number} pid
     * @param {Noun} path
     * @returns {Promise<Noun>}
     */
    peek(pid, path) {
        const ret = wasm.grpcclient_peek(this.__wbg_ptr, pid, path);
        return ret;
    }
    /**
     * Poke a Nock application
     * @param {number} pid
     * @param {PbCom1Wire} wire
     * @param {Noun} payload
     * @returns {Promise<void>}
     */
    poke(pid, wire, payload) {
        const ret = wasm.grpcclient_poke(this.__wbg_ptr, pid, wire, payload);
        return ret;
    }
}
if (Symbol.dispose) GrpcClient.prototype[Symbol.dispose] = GrpcClient.prototype.free;

const IntoUnderlyingByteSourceFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_intounderlyingbytesource_free(ptr >>> 0, 1));

export class IntoUnderlyingByteSource {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        IntoUnderlyingByteSourceFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_intounderlyingbytesource_free(ptr, 0);
    }
    /**
     * @returns {number}
     */
    get autoAllocateChunkSize() {
        const ret = wasm.intounderlyingbytesource_autoAllocateChunkSize(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @param {ReadableByteStreamController} controller
     * @returns {Promise<any>}
     */
    pull(controller) {
        const ret = wasm.intounderlyingbytesource_pull(this.__wbg_ptr, controller);
        return ret;
    }
    /**
     * @param {ReadableByteStreamController} controller
     */
    start(controller) {
        wasm.intounderlyingbytesource_start(this.__wbg_ptr, controller);
    }
    /**
     * @returns {ReadableStreamType}
     */
    get type() {
        const ret = wasm.intounderlyingbytesource_type(this.__wbg_ptr);
        return __wbindgen_enum_ReadableStreamType[ret];
    }
    cancel() {
        const ptr = this.__destroy_into_raw();
        wasm.intounderlyingbytesource_cancel(ptr);
    }
}
if (Symbol.dispose) IntoUnderlyingByteSource.prototype[Symbol.dispose] = IntoUnderlyingByteSource.prototype.free;

const IntoUnderlyingSinkFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_intounderlyingsink_free(ptr >>> 0, 1));

export class IntoUnderlyingSink {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        IntoUnderlyingSinkFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_intounderlyingsink_free(ptr, 0);
    }
    /**
     * @param {any} reason
     * @returns {Promise<any>}
     */
    abort(reason) {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.intounderlyingsink_abort(ptr, reason);
        return ret;
    }
    /**
     * @returns {Promise<any>}
     */
    close() {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.intounderlyingsink_close(ptr);
        return ret;
    }
    /**
     * @param {any} chunk
     * @returns {Promise<any>}
     */
    write(chunk) {
        const ret = wasm.intounderlyingsink_write(this.__wbg_ptr, chunk);
        return ret;
    }
}
if (Symbol.dispose) IntoUnderlyingSink.prototype[Symbol.dispose] = IntoUnderlyingSink.prototype.free;

const IntoUnderlyingSourceFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_intounderlyingsource_free(ptr >>> 0, 1));

export class IntoUnderlyingSource {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        IntoUnderlyingSourceFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_intounderlyingsource_free(ptr, 0);
    }
    /**
     * @param {ReadableStreamDefaultController} controller
     * @returns {Promise<any>}
     */
    pull(controller) {
        const ret = wasm.intounderlyingsource_pull(this.__wbg_ptr, controller);
        return ret;
    }
    cancel() {
        const ptr = this.__destroy_into_raw();
        wasm.intounderlyingsource_cancel(ptr);
    }
}
if (Symbol.dispose) IntoUnderlyingSource.prototype[Symbol.dispose] = IntoUnderlyingSource.prototype.free;

const PrivateKeyFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_privatekey_free(ptr >>> 0, 1));

export class PrivateKey {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(PrivateKey.prototype);
        obj.__wbg_ptr = ptr;
        PrivateKeyFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        PrivateKeyFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_privatekey_free(ptr, 0);
    }
    /**
     * Construct a bytes-backed key.
     * @param {Uint8Array} signing_key_bytes
     * @returns {PrivateKey}
     */
    static fromBytes(signing_key_bytes) {
        const ptr0 = passArray8ToWasm0(signing_key_bytes, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.privatekey_fromBytes(ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return PrivateKey.__wrap(ret[0]);
    }
    /**
     * Return this key's public key as 97-byte uncompressed bytes.
     * @returns {Uint8Array}
     */
    get publicKey() {
        const ret = wasm.privatekey_publicKey(this.__wbg_ptr);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
    /**
     * Return the backend kind for debugging and feature checks.
     * @returns {string}
     */
    backendKind() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.privatekey_backendKind(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Return the derivation path for this key backend, if available.
     *
     * Bytes-backed keys return `undefined` in JavaScript.
     * @returns {string | undefined}
     */
    get derivationPath() {
        const ret = wasm.privatekey_derivationPath(this.__wbg_ptr);
        let v1;
        if (ret[0] !== 0) {
            v1 = getStringFromWasm0(ret[0], ret[1]).slice();
            wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        }
        return v1;
    }
    /**
     * Construct a wasm `PrivateKey` from 32-byte private key material.
     *
     * This object is created in JavaScript and then passed into Rust signing APIs.
     *
     * # JavaScript example
     *
     * ```javascript
     * import init, { PrivateKey, TxBuilder } from "iris-wasm";
     *
     * await init();
     *
     * const keyBytes = Uint8Array.from([
     *   // 32 bytes
     * ]);
     *
     * const key = PrivateKey.fromBytes(keyBytes);
     *
     * const builder = new TxBuilder(settings);
     * // ... configure builder ...
     * await builder.sign(key);
     * ```
     * @param {Uint8Array} signing_key_bytes
     */
    constructor(signing_key_bytes) {
        const ptr0 = passArray8ToWasm0(signing_key_bytes, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.privatekey_new(ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        this.__wbg_ptr = ret[0] >>> 0;
        PrivateKeyFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
}
if (Symbol.dispose) PrivateKey.prototype[Symbol.dispose] = PrivateKey.prototype.free;

const SpendBuilderFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_spendbuilder_free(ptr >>> 0, 1));

export class SpendBuilder {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(SpendBuilder.prototype);
        obj.__wbg_ptr = ptr;
        SpendBuilderFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        SpendBuilderFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_spendbuilder_free(ptr, 0);
    }
    /**
     * @returns {SeedV1 | undefined}
     */
    curRefund() {
        const ret = wasm.spendbuilder_curRefund(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {boolean}
     */
    isBalanced() {
        const ret = wasm.spendbuilder_isBalanced(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @param {Uint8Array} preimage_jam
     * @returns {Digest | undefined}
     */
    addPreimage(preimage_jam) {
        const ptr0 = passArray8ToWasm0(preimage_jam, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.spendbuilder_addPreimage(this.__wbg_ptr, ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {boolean} include_lock_data
     */
    computeRefund(include_lock_data) {
        wasm.spendbuilder_computeRefund(this.__wbg_ptr, include_lock_data);
    }
    invalidateSigs() {
        wasm.spendbuilder_invalidateSigs(this.__wbg_ptr);
    }
    /**
     * @returns {MissingUnlocks[]}
     */
    missingUnlocks() {
        const ret = wasm.spendbuilder_missingUnlocks(this.__wbg_ptr);
        if (ret[3]) {
            throw takeFromExternrefTable0(ret[2]);
        }
        var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * @param {Nicks} fee
     */
    fee(fee) {
        wasm.spendbuilder_fee(this.__wbg_ptr, fee);
    }
    /**
     * Create a new `SpendBuilder` with a given note and spend condition
     * @param {Note} note
     * @param {Lock | null} [lock]
     * @param {number | null} [lock_sp_index]
     * @param {LockRoot | null} [refund_lock]
     */
    constructor(note, lock, lock_sp_index, refund_lock) {
        const ret = wasm.spendbuilder_new(note, isLikeNone(lock) ? 0 : addToExternrefTable0(lock), isLikeNone(lock_sp_index) ? 0x100000001 : (lock_sp_index) >>> 0, isLikeNone(refund_lock) ? 0 : addToExternrefTable0(refund_lock));
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        this.__wbg_ptr = ret[0] >>> 0;
        SpendBuilderFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @param {SeedV1} seed
     */
    seed(seed) {
        const ret = wasm.spendbuilder_seed(this.__wbg_ptr, seed);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * @param {PrivateKey} signing_key
     * @returns {Promise<boolean>}
     */
    sign(signing_key) {
        _assertClass(signing_key, PrivateKey);
        const ret = wasm.spendbuilder_sign(this.__wbg_ptr, signing_key.__wbg_ptr);
        return ret;
    }
}
if (Symbol.dispose) SpendBuilder.prototype[Symbol.dispose] = SpendBuilder.prototype.free;

const TxBuilderFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_txbuilder_free(ptr >>> 0, 1));

export class TxBuilder {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(TxBuilder.prototype);
        obj.__wbg_ptr = ptr;
        TxBuilderFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        TxBuilderFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_txbuilder_free(ptr, 0);
    }
    /**
     * @returns {SpendBuilder[]}
     */
    allSpends() {
        const ret = wasm.txbuilder_allSpends(this.__wbg_ptr);
        var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * Reconstruct a builder from raw transaction.
     * @param {RawTx} tx
     * @param {TxEngineSettings} settings
     * @returns {TxBuilder}
     */
    static fromRawTx(tx, settings) {
        const ret = wasm.txbuilder_fromRawTx(tx, settings);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return TxBuilder.__wrap(ret[0]);
    }
    /**
     * @param {Uint8Array} preimage_jam
     * @returns {Digest | undefined}
     */
    addPreimage(preimage_jam) {
        const ptr0 = passArray8ToWasm0(preimage_jam, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.txbuilder_addPreimage(this.__wbg_ptr, ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {Note[]} notes
     * @param {TxLock[]} locks
     * @param {Digest} recipient
     * @param {Nicks} gift
     * @param {Nicks | null | undefined} fee_override
     * @param {Digest} refund_pkh
     * @param {boolean} include_lock_data
     */
    simpleSpend(notes, locks, recipient, gift, fee_override, refund_pkh, include_lock_data) {
        const ptr0 = passArrayJsValueToWasm0(notes, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArrayJsValueToWasm0(locks, wasm.__wbindgen_malloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.txbuilder_simpleSpend(this.__wbg_ptr, ptr0, len0, ptr1, len1, recipient, gift, isLikeNone(fee_override) ? 0 : addToExternrefTable0(fee_override), refund_pkh, include_lock_data);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * Reconstruct a builder from Nockchain transaction.
     * @param {NockchainTx} tx
     * @param {TxEngineSettings} settings
     * @returns {TxBuilder}
     */
    static fromNockchainTx(tx, settings) {
        const ret = wasm.txbuilder_fromNockchainTx(tx, settings);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return TxBuilder.__wrap(ret[0]);
    }
    /**
     * @param {boolean} include_lock_data
     */
    recalcAndSetFee(include_lock_data) {
        const ret = wasm.txbuilder_recalcAndSetFee(this.__wbg_ptr, include_lock_data);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * @param {Nicks} fee
     * @param {boolean} adjust_fee
     * @param {boolean} include_lock_data
     */
    setFeeAndBalanceRefund(fee, adjust_fee, include_lock_data) {
        const ret = wasm.txbuilder_setFeeAndBalanceRefund(this.__wbg_ptr, fee, adjust_fee, include_lock_data);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * Create an empty transaction builder
     * @param {TxEngineSettings} settings
     */
    constructor(settings) {
        const ret = wasm.txbuilder_new(settings);
        this.__wbg_ptr = ret >>> 0;
        TxBuilderFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @param {PrivateKey} signing_key
     * @returns {Promise<void>}
     */
    sign(signing_key) {
        _assertClass(signing_key, PrivateKey);
        const ret = wasm.txbuilder_sign(this.__wbg_ptr, signing_key.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {NockchainTx}
     */
    build() {
        const ret = wasm.txbuilder_build(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * Append a `SpendBuilder` to this transaction
     * @param {SpendBuilder} spend
     * @returns {SpendBuilder | undefined}
     */
    spend(spend) {
        _assertClass(spend, SpendBuilder);
        var ptr0 = spend.__destroy_into_raw();
        const ret = wasm.txbuilder_spend(this.__wbg_ptr, ptr0);
        return ret === 0 ? undefined : SpendBuilder.__wrap(ret);
    }
    /**
     * @returns {Nicks}
     */
    curFee() {
        const ret = wasm.txbuilder_curFee(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {Nicks}
     */
    calcFee() {
        const ret = wasm.txbuilder_calcFee(this.__wbg_ptr);
        return ret;
    }
    validate() {
        const ret = wasm.txbuilder_validate(this.__wbg_ptr);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
}
if (Symbol.dispose) TxBuilder.prototype[Symbol.dispose] = TxBuilder.prototype.free;

const EXPECTED_RESPONSE_TYPES = new Set(['basic', 'cors', 'default']);

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);

            } catch (e) {
                const validResponse = module.ok && EXPECTED_RESPONSE_TYPES.has(module.type);

                if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else {
                    throw e;
                }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);

    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };

        } else {
            return instance;
        }
    }
}

function __wbg_get_imports() {
    const imports = {};
    imports.wbg = {};
    imports.wbg.__wbg___wbindgen_debug_string_df47ffb5e35e6763 = function(arg0, arg1) {
        const ret = debugString(arg1);
        const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
        getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
    };
    imports.wbg.__wbg___wbindgen_is_function_ee8a6c5833c90377 = function(arg0) {
        const ret = typeof(arg0) === 'function';
        return ret;
    };
    imports.wbg.__wbg___wbindgen_is_object_c818261d21f283a4 = function(arg0) {
        const val = arg0;
        const ret = typeof(val) === 'object' && val !== null;
        return ret;
    };
    imports.wbg.__wbg___wbindgen_is_undefined_2d472862bd29a478 = function(arg0) {
        const ret = arg0 === undefined;
        return ret;
    };
    imports.wbg.__wbg___wbindgen_string_get_e4f06c90489ad01b = function(arg0, arg1) {
        const obj = arg1;
        const ret = typeof(obj) === 'string' ? obj : undefined;
        var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len1 = WASM_VECTOR_LEN;
        getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
        getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
    };
    imports.wbg.__wbg___wbindgen_throw_b855445ff6a94295 = function(arg0, arg1) {
        throw new Error(getStringFromWasm0(arg0, arg1));
    };
    imports.wbg.__wbg__wbg_cb_unref_2454a539ea5790d9 = function(arg0) {
        arg0._wbg_cb_unref();
    };
    imports.wbg.__wbg_append_b577eb3a177bc0fa = function() { return handleError(function (arg0, arg1, arg2, arg3, arg4) {
        arg0.append(getStringFromWasm0(arg1, arg2), getStringFromWasm0(arg3, arg4));
    }, arguments) };
    imports.wbg.__wbg_body_587542b2fd8e06c0 = function(arg0) {
        const ret = arg0.body;
        return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
    };
    imports.wbg.__wbg_buffer_ccc4520b36d3ccf4 = function(arg0) {
        const ret = arg0.buffer;
        return ret;
    };
    imports.wbg.__wbg_byobRequest_2344e6975f27456e = function(arg0) {
        const ret = arg0.byobRequest;
        return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
    };
    imports.wbg.__wbg_byteLength_bcd42e4025299788 = function(arg0) {
        const ret = arg0.byteLength;
        return ret;
    };
    imports.wbg.__wbg_byteOffset_ca3a6cf7944b364b = function(arg0) {
        const ret = arg0.byteOffset;
        return ret;
    };
    imports.wbg.__wbg_call_525440f72fbfc0ea = function() { return handleError(function (arg0, arg1, arg2) {
        const ret = arg0.call(arg1, arg2);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_call_e762c39fa8ea36bf = function() { return handleError(function (arg0, arg1) {
        const ret = arg0.call(arg1);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_cancel_48ab6f9dc366e369 = function(arg0) {
        const ret = arg0.cancel();
        return ret;
    };
    imports.wbg.__wbg_catch_943836faa5d29bfb = function(arg0, arg1) {
        const ret = arg0.catch(arg1);
        return ret;
    };
    imports.wbg.__wbg_close_5a6caed3231b68cd = function() { return handleError(function (arg0) {
        arg0.close();
    }, arguments) };
    imports.wbg.__wbg_close_6956df845478561a = function() { return handleError(function (arg0) {
        arg0.close();
    }, arguments) };
    imports.wbg.__wbg_done_2042aa2670fb1db1 = function(arg0) {
        const ret = arg0.done;
        return ret;
    };
    imports.wbg.__wbg_enqueue_7b18a650aec77898 = function() { return handleError(function (arg0, arg1) {
        arg0.enqueue(arg1);
    }, arguments) };
    imports.wbg.__wbg_error_7534b8e9a36f1ab4 = function(arg0, arg1) {
        let deferred0_0;
        let deferred0_1;
        try {
            deferred0_0 = arg0;
            deferred0_1 = arg1;
            console.error(getStringFromWasm0(arg0, arg1));
        } finally {
            wasm.__wbindgen_free(deferred0_0, deferred0_1, 1);
        }
    };
    imports.wbg.__wbg_fetch_769f3df592e37b75 = function(arg0, arg1) {
        const ret = fetch(arg0, arg1);
        return ret;
    };
    imports.wbg.__wbg_fetch_8725865ff47e7fcc = function(arg0, arg1, arg2) {
        const ret = arg0.fetch(arg1, arg2);
        return ret;
    };
    imports.wbg.__wbg_getReader_48e00749fe3f6089 = function() { return handleError(function (arg0) {
        const ret = arg0.getReader();
        return ret;
    }, arguments) };
    imports.wbg.__wbg_get_7bed016f185add81 = function(arg0, arg1) {
        const ret = arg0[arg1 >>> 0];
        return ret;
    };
    imports.wbg.__wbg_get_done_a0463af43a1fc764 = function(arg0) {
        const ret = arg0.done;
        return isLikeNone(ret) ? 0xFFFFFF : ret ? 1 : 0;
    };
    imports.wbg.__wbg_get_efcb449f58ec27c2 = function() { return handleError(function (arg0, arg1) {
        const ret = Reflect.get(arg0, arg1);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_get_value_5ce96c9f81ce7398 = function(arg0) {
        const ret = arg0.value;
        return ret;
    };
    imports.wbg.__wbg_has_787fafc980c3ccdb = function() { return handleError(function (arg0, arg1) {
        const ret = Reflect.has(arg0, arg1);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_headers_b87d7eaba61c3278 = function(arg0) {
        const ret = arg0.headers;
        return ret;
    };
    imports.wbg.__wbg_iterator_e5822695327a3c39 = function() {
        const ret = Symbol.iterator;
        return ret;
    };
    imports.wbg.__wbg_length_69bca3cb64fc8748 = function(arg0) {
        const ret = arg0.length;
        return ret;
    };
    imports.wbg.__wbg_new_1acc0b6eea89d040 = function() {
        const ret = new Object();
        return ret;
    };
    imports.wbg.__wbg_new_3c3d849046688a66 = function(arg0, arg1) {
        try {
            var state0 = {a: arg0, b: arg1};
            var cb0 = (arg0, arg1) => {
                const a = state0.a;
                state0.a = 0;
                try {
                    return wasm_bindgen__convert__closures_____invoke__h326fdb3bcde44ceb(a, state0.b, arg0, arg1);
                } finally {
                    state0.a = a;
                }
            };
            const ret = new Promise(cb0);
            return ret;
        } finally {
            state0.a = state0.b = 0;
        }
    };
    imports.wbg.__wbg_new_5a79be3ab53b8aa5 = function(arg0) {
        const ret = new Uint8Array(arg0);
        return ret;
    };
    imports.wbg.__wbg_new_8a6f238a6ece86ea = function() {
        const ret = new Error();
        return ret;
    };
    imports.wbg.__wbg_new_9edf9838a2def39c = function() { return handleError(function () {
        const ret = new Headers();
        return ret;
    }, arguments) };
    imports.wbg.__wbg_new_a7442b4b19c1a356 = function(arg0, arg1) {
        const ret = new Error(getStringFromWasm0(arg0, arg1));
        return ret;
    };
    imports.wbg.__wbg_new_from_slice_92f4d78ca282a2d2 = function(arg0, arg1) {
        const ret = new Uint8Array(getArrayU8FromWasm0(arg0, arg1));
        return ret;
    };
    imports.wbg.__wbg_new_no_args_ee98eee5275000a4 = function(arg0, arg1) {
        const ret = new Function(getStringFromWasm0(arg0, arg1));
        return ret;
    };
    imports.wbg.__wbg_new_with_byte_offset_and_length_46e3e6a5e9f9e89b = function(arg0, arg1, arg2) {
        const ret = new Uint8Array(arg0, arg1 >>> 0, arg2 >>> 0);
        return ret;
    };
    imports.wbg.__wbg_new_with_str_and_init_0ae7728b6ec367b1 = function() { return handleError(function (arg0, arg1, arg2) {
        const ret = new Request(getStringFromWasm0(arg0, arg1), arg2);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_next_020810e0ae8ebcb0 = function() { return handleError(function (arg0) {
        const ret = arg0.next();
        return ret;
    }, arguments) };
    imports.wbg.__wbg_next_2c826fe5dfec6b6a = function(arg0) {
        const ret = arg0.next;
        return ret;
    };
    imports.wbg.__wbg_parse_2a704d6b78abb2b8 = function() { return handleError(function (arg0, arg1) {
        const ret = JSON.parse(getStringFromWasm0(arg0, arg1));
        return ret;
    }, arguments) };
    imports.wbg.__wbg_prototypesetcall_2a6620b6922694b2 = function(arg0, arg1, arg2) {
        Uint8Array.prototype.set.call(getArrayU8FromWasm0(arg0, arg1), arg2);
    };
    imports.wbg.__wbg_queueMicrotask_34d692c25c47d05b = function(arg0) {
        const ret = arg0.queueMicrotask;
        return ret;
    };
    imports.wbg.__wbg_queueMicrotask_9d76cacb20c84d58 = function(arg0) {
        queueMicrotask(arg0);
    };
    imports.wbg.__wbg_read_48f1593df542f968 = function(arg0) {
        const ret = arg0.read();
        return ret;
    };
    imports.wbg.__wbg_releaseLock_5d0b5a68887b891d = function(arg0) {
        arg0.releaseLock();
    };
    imports.wbg.__wbg_resolve_caf97c30b83f7053 = function(arg0) {
        const ret = Promise.resolve(arg0);
        return ret;
    };
    imports.wbg.__wbg_respond_0f4dbf5386f5c73e = function() { return handleError(function (arg0, arg1) {
        arg0.respond(arg1 >>> 0);
    }, arguments) };
    imports.wbg.__wbg_set_9e6516df7b7d0f19 = function(arg0, arg1, arg2) {
        arg0.set(getArrayU8FromWasm0(arg1, arg2));
    };
    imports.wbg.__wbg_set_body_3c365989753d61f4 = function(arg0, arg1) {
        arg0.body = arg1;
    };
    imports.wbg.__wbg_set_cache_2f9deb19b92b81e3 = function(arg0, arg1) {
        arg0.cache = __wbindgen_enum_RequestCache[arg1];
    };
    imports.wbg.__wbg_set_credentials_f621cd2d85c0c228 = function(arg0, arg1) {
        arg0.credentials = __wbindgen_enum_RequestCredentials[arg1];
    };
    imports.wbg.__wbg_set_headers_6926da238cd32ee4 = function(arg0, arg1) {
        arg0.headers = arg1;
    };
    imports.wbg.__wbg_set_integrity_62a46fc792832f41 = function(arg0, arg1, arg2) {
        arg0.integrity = getStringFromWasm0(arg1, arg2);
    };
    imports.wbg.__wbg_set_method_c02d8cbbe204ac2d = function(arg0, arg1, arg2) {
        arg0.method = getStringFromWasm0(arg1, arg2);
    };
    imports.wbg.__wbg_set_mode_52ef73cfa79639cb = function(arg0, arg1) {
        arg0.mode = __wbindgen_enum_RequestMode[arg1];
    };
    imports.wbg.__wbg_set_redirect_df0285496ec45ff8 = function(arg0, arg1) {
        arg0.redirect = __wbindgen_enum_RequestRedirect[arg1];
    };
    imports.wbg.__wbg_set_referrer_ec9cf8a8a315d50c = function(arg0, arg1, arg2) {
        arg0.referrer = getStringFromWasm0(arg1, arg2);
    };
    imports.wbg.__wbg_set_referrer_policy_99c1f299b4e37446 = function(arg0, arg1) {
        arg0.referrerPolicy = __wbindgen_enum_ReferrerPolicy[arg1];
    };
    imports.wbg.__wbg_spendbuilder_new = function(arg0) {
        const ret = SpendBuilder.__wrap(arg0);
        return ret;
    };
    imports.wbg.__wbg_stack_0ed75d68575b0f3c = function(arg0, arg1) {
        const ret = arg1.stack;
        const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
        getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
    };
    imports.wbg.__wbg_static_accessor_GLOBAL_89e1d9ac6a1b250e = function() {
        const ret = typeof global === 'undefined' ? null : global;
        return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
    };
    imports.wbg.__wbg_static_accessor_GLOBAL_THIS_8b530f326a9e48ac = function() {
        const ret = typeof globalThis === 'undefined' ? null : globalThis;
        return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
    };
    imports.wbg.__wbg_static_accessor_SELF_6fdf4b64710cc91b = function() {
        const ret = typeof self === 'undefined' ? null : self;
        return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
    };
    imports.wbg.__wbg_static_accessor_WINDOW_b45bfc5a37f6cfa2 = function() {
        const ret = typeof window === 'undefined' ? null : window;
        return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
    };
    imports.wbg.__wbg_status_de7eed5a7a5bfd5d = function(arg0) {
        const ret = arg0.status;
        return ret;
    };
    imports.wbg.__wbg_stringify_b5fb28f6465d9c3e = function() { return handleError(function (arg0) {
        const ret = JSON.stringify(arg0);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_then_4f46f6544e6b4a28 = function(arg0, arg1) {
        const ret = arg0.then(arg1);
        return ret;
    };
    imports.wbg.__wbg_then_70d05cf780a18d77 = function(arg0, arg1, arg2) {
        const ret = arg0.then(arg1, arg2);
        return ret;
    };
    imports.wbg.__wbg_toString_7da7c8dbec78fcb8 = function(arg0) {
        const ret = arg0.toString();
        return ret;
    };
    imports.wbg.__wbg_value_692627309814bb8c = function(arg0) {
        const ret = arg0.value;
        return ret;
    };
    imports.wbg.__wbg_view_f6c15ac9fed63bbd = function(arg0) {
        const ret = arg0.view;
        return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
    };
    imports.wbg.__wbindgen_cast_2241b6af4c4b2941 = function(arg0, arg1) {
        // Cast intrinsic for `Ref(String) -> Externref`.
        const ret = getStringFromWasm0(arg0, arg1);
        return ret;
    };
    imports.wbg.__wbindgen_cast_dda094bec465973e = function(arg0, arg1) {
        // Cast intrinsic for `Closure(Closure { dtor_idx: 415, function: Function { arguments: [Externref], shim_idx: 416, ret: Unit, inner_ret: Some(Unit) }, mutable: true }) -> Externref`.
        const ret = makeMutClosure(arg0, arg1, wasm.wasm_bindgen__closure__destroy__haffc2f8a6add1279, wasm_bindgen__convert__closures_____invoke__h7f888ae473d7b77e);
        return ret;
    };
    imports.wbg.__wbindgen_init_externref_table = function() {
        const table = wasm.__wbindgen_externrefs;
        const offset = table.grow(4);
        table.set(0, undefined);
        table.set(offset + 0, undefined);
        table.set(offset + 1, null);
        table.set(offset + 2, true);
        table.set(offset + 3, false);
        ;
    };

    return imports;
}

function __wbg_finalize_init(instance, module) {
    wasm = instance.exports;
    __wbg_init.__wbindgen_wasm_module = module;
    cachedDataViewMemory0 = null;
    cachedUint8ArrayMemory0 = null;


    wasm.__wbindgen_start();
    return wasm;
}

function initSync(module) {
    if (wasm !== undefined) return wasm;


    if (typeof module !== 'undefined') {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({module} = module)
        } else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
        }
    }

    const imports = __wbg_get_imports();

    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }

    const instance = new WebAssembly.Instance(module, imports);

    return __wbg_finalize_init(instance, module);
}

async function __wbg_init(module_or_path) {
    if (wasm !== undefined) return wasm;


    if (typeof module_or_path !== 'undefined') {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({module_or_path} = module_or_path)
        } else {
            console.warn('using deprecated parameters for the initialization function; pass a single object instead')
        }
    }

    if (typeof module_or_path === 'undefined') {
        module_or_path = new URL('iris_wasm_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync };
export default __wbg_init;
