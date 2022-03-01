$(document).ready(() =>
{

    $('#generate_key').click(() =>
    {
        // Generating private key
        const privateKeyBuf = window.crypto.getRandomValues(new Uint8Array(32))
        const privateKey = Secp256k1.uint256(privateKeyBuf, 16)

        // Generating public key
        const publicKey = Secp256k1.generatePublicKeyFromPrivateKeyData(privateKey)
        const pubX = Secp256k1.uint256(publicKey.x, 16)
        const pubY = Secp256k1.uint256(publicKey.y, 16)

        console.log({'key2': xbqcrypto.deduce_private_base58check(window.crypto.getRandomValues(new Uint8Array(32)))});
        console.log(privateKeyBuf);
        console.log('test = ');
        //console.log({'key': Utf8ArrayToStr(privateKeyBuf)});
        //var str = String.fromCharCode.apply(null, privateKeyBuf);
        console.log({'key2': privateKeyBuf.toString()});
        console.log(privateKey);
        console.log(publicKey);

        // Signing a digest
        const digest = Secp256k1.uint256("483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8", 16)
        const sig = Secp256k1.ecsign(privateKey, digest)
        const sigR = Secp256k1.uint256(sig.r,16)
        const sigS = Secp256k1.uint256(sig.s,16)

        // Verifying signature
        const isValidSig = Secp256k1.ecverify(pubX, pubY, sigR, sigS, digest)
        console.assert(isValidSig === true, 'Signature must be valid')
    })


    function Utf8ArrayToStr(array) {
        var out, i, len, c;
        var char2, char3;
    
        out = "";
        len = array.length;
        i = 0;
        while(i < len) {
        c = array[i++];
        switch(c >> 4)
        { 
          case 0: case 1: case 2: case 3: case 4: case 5: case 6: case 7:
            // 0xxxxxxx
            out += String.fromCharCode(c);
            break;
          case 12: case 13:
            // 110x xxxx   10xx xxxx
            char2 = array[i++];
            out += String.fromCharCode(((c & 0x1F) << 6) | (char2 & 0x3F));
            break;
          case 14:
            // 1110 xxxx  10xx xxxx  10xx xxxx
            char2 = array[i++];
            char3 = array[i++];
            out += String.fromCharCode(((c & 0x0F) << 12) |
                           ((char2 & 0x3F) << 6) |
                           ((char3 & 0x3F) << 0));
            break;
        }
        }
    
        return out;
    }
});