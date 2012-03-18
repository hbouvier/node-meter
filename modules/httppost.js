var http  = require('http'),
    util  = require('util');

module.exports = (function () {
    var defaultPostOptions = {
        host: 'localhost',
        port: 80,
        path: '/',
        method: 'POST'
    },
    verbose = false;
    
    function clone(obj) {
        var newObj = {};
        for (var key in obj) {
            if (obj.hasOwnProperty(key))
                newObj[key] = obj[key];
        }
        return newObj;
    }
    function merge(src, dst) {
        if (!dst) dst = {};
        for (var key in src) {
            if (src.hasOwnProperty(key) && !dst.hasOwnProperty(key))
                dst[key] = src[key];
        }
        return dst;
    }

    function post(options, body, callback) {
        var boundary = Math.random(),
            postData = null;
        options  = merge(defaultPostOptions, options);
        if (verbose) util.log('httppost|post|options=' + util.inspect(options));
        if (typeof(body) === 'object') {
            postData = '';
            for (var key in body) {
                if (body.hasOwnProperty(key)) {
                    postData += encodeField(boundary, key, body[key]);
                }
            }
            options.headers = merge({
                'Content-Type' : 'multipart/form-data; boundary=' + boundary,
                'Content-Length' : Buffer.byteLength(postData)
            }, options.headers);
        } else if (body) {
            postData = body;
            options.headers = merge({'Content-Length' : Buffer.byteLength(postData)}, options.headers);
        }
        var req = http.request(options, function(res) {
            var requestData = '';
            if (verbose) util.log('httppost|post|response|code=' + res.statusCode + '|header=' + util.inspect(res.headers, true, null));
            res.setEncoding('utf8');
            res.on('data', function(data) {
                if (verbose) util.log('httppost|post|response|data='+ data);
                requestData += data;
            });
            res.on('end', function(data) {
                if (data)
                    requestData += data;
                if (verbose) util.log('httppost|post|response|end=' + requestData);
                if (callback)
                    callback(null, requestData);
            });
        });
        if (postData) {
            req.write(postData);
        }
        req.end();
        req.on('error', function(err) {
            util.log('httppost|post|ERROR=' + err);
            if (callback)
                callback(err, null);
        });
    }
    
    function encodeField(boundary, name, value) {
        var buffer = '--' + boundary + '\r\n';
        buffer += 'Content-Disposition: form-data; name="' + name + '"\r\n\r\n';
        buffer += value + '\r\n';
        return buffer;
    }

    function encodeFile(boundary, type, name, filename) {
        var buffer = "--" + boundary + "\r\n";
        buffer += 'Content-Disposition: form-data; name="' + name + '"; filename="' + filename + '"\r\n';
        buffer += 'Content-Type: ' + type + '\r\n\r\n';
        return buffer;
    }
        
    return  {
        "post"             : post
    };
})();
