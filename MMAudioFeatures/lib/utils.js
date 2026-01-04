'use strict';

class Utils {
    // Convert numerical key to MediaMonkey string format
    static convertKeyToString(keyNumber) {
        if (keyNumber === null || keyNumber === undefined || typeof keyNumber !== 'number') {
            return '';
        }

        if (keyNumber < 0) {
            return '';
        }

        // MediaMonkey key mapping: 0-11 = Major keys, 12-23 = Minor keys
        const keyNames = [
            // Major keys (0-11)
            'C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B',
            // Minor keys (12-23)
            'Cm', 'Dbm', 'Dm', 'Ebm', 'Em', 'Fm', 'Gbm', 'Gm', 'Abm', 'Am', 'Bbm', 'Bm'
        ];

        if (keyNumber >= 0 && keyNumber < keyNames.length) {
            return keyNames[keyNumber];
        }

        // Fallback for unknown values
        return '';
    }

    // Convert string key back to number (reverse mapping)
    static convertStringToKey(keyString) {
        if (!keyString || typeof keyString !== 'string') {
            return null;
        }

        const keyNames = [
            // Major keys (0-11)
            'C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B',
            // Minor keys (12-23)
            'Cm', 'Dbm', 'Dm', 'Ebm', 'Em', 'Fm', 'Gbm', 'Gm', 'Abm', 'Am', 'Bbm', 'Bm'
        ];

        const index = keyNames.indexOf(keyString.trim());
        return index >= 0 ? index : -1;
    }

    static formatDuration(durationMs) {
        if (!durationMs) {
            return 'N/A';
        }

        const minutes = Math.floor(durationMs / 60000);
        const seconds = Math.round((durationMs % 60000) / 1000);

        if (seconds === 60) {
            return (minutes + 1) + ':00';
        }

        return minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
    }
}

// For Node.js environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Utils };
} else {
    // For browser/MediaMonkey environments
    window.Utils = Utils;
}