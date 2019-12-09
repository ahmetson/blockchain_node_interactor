const request = require("request");
const { default: Neon, api, wallet, u, nep5, sc } = require("@cityofzion/neon-js");

const settings = {
	neo: {
		testnet: {
			whitelist: [
				".ngd.network",
				".cityofzion.io",
				".redpulse.com"
			],
			node_list_url: "http://monitor.cityofzion.io/assets/testnet.json",
			scaners: [ 
				{ 
					uri: "https://neoscan-testnet.io/api/test_net/v1/get_height",
					method: "GET",
					raw_parameter: "",
					response_nest: [
						"height"
					]
				}, 
				{ 
					uri: "https://api.nel.group/api/testnet",
					method: "POST",
					raw_parameter: '{"jsonrpc": "2.0", "method": "getblockcount", "params": [],"id": 1}',
					response_nest: [
						"result",
						0,
						"blockcount"
					]
				},
			]
		},
		mainnet: {
			whitelist: [
				".ngd.network",
				".cityofzion.io",
				".redpulse.com"

			],
			node_list_url: "http://monitor.cityofzion.io/assets/mainnet.json",
			scaners: [ 
				{ 
					uri: "https://neoscan.io/api/main_net/v1/get_height",
					method: "GET",
					raw_parameter: "",
					response_nest: [
						"height"
					]
				}, 
				{ 
					uri: "https://api.nel.group/api/mainnet",
					method: "POST",
					raw_parameter: '{"jsonrpc": "2.0", "method": "getblockcount", "params": [],"id": 1}',
					response_nest: [
						"result",
						0,
						"blockcount"
					]
				},
			]
		}
	}
};


var get_settings = function(blockchain, network) {
	if (settings[blockchain] != undefined && settings[blockchain][network] != undefined) {
		return settings[blockchain][network];
	}
	return undefined;
};

module.exports = {
	pick_random_node : function (blockchain, network, callback) {
		var data = get_settings(blockchain, network);
		if (data == undefined) {
			console.log(blockchain+" on "+network+" is not supported by node selector!");
			process.exit(1);
		}

		// return promise of get_node_list
		this.get_node_list(data, function(data, nodes) {
			var height = 0;
			var checked_scaners_amount = 0;

			for (var i = 0; i<data["scaners"].length; i++) {
				this.request_scaner(data["scaners"][i], function(request_parameters, scaner_response) {
					if (scaner_response > height) {
						height = scaner_response;
					}

					checked_scaners_amount++;
					if (checked_scaners_amount == data["scaners"].length) {
						this.get_node_block_height(nodes, height, callback);
					}
				}.bind(this));
			}
		}.bind(this));

	},

	get_node_block_height(nodes, blockheight, callback) {
		var checked_nodes = [];
		var uphealed_nodes = [];

		setTimeout( function() {
			if (uphealed_nodes.length > 0 ) {
				var index = parseInt((Math.random()) * uphealed_nodes.length);
				// console.log("Random picked node:");
				// console.log(uphealed_nodes[index])
				callback(uphealed_nodes[index]);
			}
		}.bind(this), 1000);

		for(var i=0; i<nodes.length; i++) {
			var url = nodes[i].protocol + "://" + nodes[i].url;
			if (nodes[i].port != undefined) {
				url = url + ":" + nodes[i].port;
			}
			var node = Neon.create.rpcClient(url);

				node.getBlockCount().then(function(nodeheight){
					if (nodeheight >= blockheight ) {
						uphealed_nodes.push(this.net);
					}
					checked_nodes.push(0);
				}.bind(node)).catch(e => {
					// console.log("Failed to connect to RPC");
					checked_nodes.push(0);
				});
		}
	},

	get_node_list(data, callback) {
		var request_pass = { 
			method: "GET",
			uri: data.node_list_url, 
			json: true
    	};

		request(
			request_pass, 
		    function (error, response, body) {
		    	if(response.statusCode == 200){
		    		if (body.sites == undefined) {
		    			console.error("failed to get node list");
		    		} else {
		    			var nodes = [];
		    			for(var i = 0; i<body.sites.length; i++) {
		    				if (body.sites[i].service == undefined) {
		    					var banned = true;
		    					for (var j = 0; j<data.whitelist.length; j++) {
		    						if (body.sites[i].url.search(data.whitelist[j]) > -1) {
		    							banned = false;
		    							break;
		    						}
		    					}

		    					if (!banned)
		    						nodes.push(body.sites[i]);
		    				}
		    			}
		    			callback(data, nodes);
		    		}
		      	} else {
		        	console.log('error: '+ response.statusCode)
		        	console.log(body)
		      	}
		    }
	    )
	},

	request_scaner(parameters, callback) {
		var request_pass = { 
			method: parameters.method,
			uri: parameters.uri, 
    	};

		if (parameters.method == "POST") {
			request_pass.json = JSON.parse(parameters.raw_parameter);
		} else if (parameters.method == "GET" ) {
			request_pass.json = true;
			request_pass.gzip = true;
		}

		request(
			request_pass, 
		    function (error, response, body) {
		    	if(response.statusCode == 200){
		    		var nested_keys = parameters.response_nest;
		        	var nested_value = body;
		        	for(var i=0; i<nested_keys.length; i++) {

		        		nested_value = nested_value[ nested_keys [i] ];
		        		if (nested_value == undefined) {
		        			// console.error("Failed to get block height from "+parameters.uri);
		        			// console.error(body);
		        			break;
		        		}
		        	}
		        	if (nested_value != undefined) {
		        		callback(parameters, parseInt(nested_value));
		        	}
		      	} else {
		        	// console.log('error: '+ response.statusCode)
		        	// console.log(body)
		      	}
		    }
	    )
	}
};
