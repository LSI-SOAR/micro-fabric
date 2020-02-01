const bs58 = require('bs58');
const NUID = require('nuid');
const crypto = require('crypto');

module.exports = (options = { length : 16, prefix = '', hash = 'sha256', firstMustBeLetter : false }) => {
    const { length, prefix, hash, firstMustBeLetter } = options;
    let uid = NUID.next();
    uid = bs58.encode(crypto.createHash(hash).update(uid+(new Date())).digest());
    if(firstMustBeLetter)
        uid = uid.replace(/^\d+/,'');
    if(prefix)
        uid = prefix+uid;
    return uid.substring(0,length);

}