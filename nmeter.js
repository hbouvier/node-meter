var Funnel  = require('../node-tts/modules/funnel'),
    util    = require('util'),
    cluster = require('cluster'),
    numCPUs = require('os').cpus().length,
    http    = require('./modules/httppost');


(function () {
    var maxRequestPerChannel =  100;
    var maxChannels          =  5000;
    var nbRequestSent        =    0;
    
    var postConfig = {
            host: 'node-geoip.heroku.com',
            port: 80,
            path: '/ws/display',
            method: 'POST'
            //headers : {'Content-Type' : 'application/json'}
    };
    
    var getConfig2 = {
            host: 'node-geoip.herokuapp.com',
            port: 80,
            path: '/ws/display',
            method: 'GET'
            //headers : {'Content-Type' : 'application/json'}
    };
    var getConfig = {
            host: '127.0.0.1',
            port: 8081,
            path: '/ws/display',  // ?ipaddress=216.191.247.86
            method: 'GET'
            //headers : {'Content-Type' : 'application/json'}
    };





    function logRequestData(err, requestData) {
        util.log('nmeter|err='+err+'|response='+requestData);
    }

    var numReqs = 0;
    function updateRequestCounter(msg) {
          if (msg.cmd && msg.cmd == 'notifyRequest') {
            numReqs++;
          }
    }

    // util.log('cluster='+util.inspect(cluster, true, null));
    if (cluster.isMaster) {
        var workers = [];
        // Fork workers.
        for (var i = 0; i < numCPUs; i++) {
            var worker = cluster.fork();
            worker.on('message', updateRequestCounter);
            workers.push(worker);
        }
        cluster.on('death', function(worker) {
            util.log('nmeter|master-pid='+process.pid+'|worker-pid=' + worker.pid + '|died|restarting');
            cluster.fork();
        });
        
        setInterval(function() {
            util.log('nmeter|master|channels='+maxChannels+'|totalRequests=' + numReqs);
            if (numReqs > maxChannels * maxRequestPerChannel) {
                util.log('nmeter|master|shuting down');
                for (var w = 0 ; w < workers.length ; ++w)
                    process.kill(workers[w].pid);
                process.kill(process.pid);
            }
        }, 1000);
        return;
    }
    
    /////////////////////////////// WORKER ////////////////////////////////
    
    var funnel = new Funnel(maxChannels / numCPUs);
    funnel.on('stats', function (stats) {
        util.log('nmeter|worker-pid='+process.pid+'|funnel|running='+stats.running+'|queued=' + stats.queued+'|averageExecTime='+stats.avgExec+'ms|averageWaitTime='+stats.avgWait+'ms');
    });

    function sendRequest() {
        if (nbRequestSent > maxChannels * maxRequestPerChannel)
            return;
        ++nbRequestSent;
        funnel.queue(http, http.post, getConfig, null, sendRequest);
        process.send({ cmd: 'notifyRequest' });
    }

    for (var cpt = 0 ; cpt < maxChannels  / numCPUs; ++cpt) {
        sendRequest();
    }
})();
