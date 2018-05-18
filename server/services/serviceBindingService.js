var Q = require("q");
var mysqlManager = require('../utils/mysqlManager');

var userExists = function (userName) {

	var d = Q.defer();

	var queryText = "SELECT * FROM mysql.user WHERE user like '" + userName + "'";
	console.log("queryText: " + queryText);

	mysqlManager.executeQuery(queryText)
		.then(function(result){
			console.log(result);
			if (result.length != 0)
			{
				d.resolve(userName);	
			}
			else
			{
				var error = new Error();
				error.message = JSON.stringify({description: "MySQL User does not exist!"})
				error.http_code = 410;
				d.reject(error);
			}
		})
		.catch(function(error){
    		d.reject(error);
		});

	return d.promise;

};

var bindExists = function (binding) {

	var d = Q.defer();

	var queryText = "SELECT 'db', User FROM mysql.db WHERE db='" + binding.schema + "' and User='" + binding.username + "'";

	console.log("queryText: " + queryText);

	mysqlManager.executeQuery(queryText)
		.then(function(result){
			console.log(result);
			if (result.length == 0)
			{
				d.resolve(binding);	
			}
			else
			{
				var error = new Error();
				error.message = JSON.stringify({description: "MySQL User already exists!"})
				error.http_code = 409;
				d.reject(error);
			}
			
		})
		.catch(function(error){
    		d.reject(error);
		});

	return d.promise;

};


var createUser = function (binding) {

	var d = Q.defer();

	var queryText = "CREATE USER '" + binding.username + "' IDENTIFIED BY '" + binding.password + "'" ;
	console.log("queryText: " + queryText);

	mysqlManager.executeQuery(queryText)
		.then(function(result){
			d.resolve(binding);
		})
		.catch(function(error){
    		d.reject(error);
		});

	return d.promise;

};

var grantPrivilege = function (binding) {

	var d = Q.defer();

	var queryText = "GRANT ALL PRIVILEGES ON `" + binding.schema + "`.* TO '" + binding.username + "'@'%'" ;
	console.log("queryText: " + queryText);

	mysqlManager.executeQuery(queryText)
		.then(function(result){
			d.resolve(binding);
		})
		.catch(function(error){
    		d.reject(error);
		});

	return d.promise;

};

var flushPrivilege = function (binding) {

	var d = Q.defer();

	var queryText = "FLUSH PRIVILEGES";
	console.log("queryText: " + queryText);

	mysqlManager.executeQuery(queryText)
		.then(function(result){
			d.resolve(binding);
		})
		.catch(function(error){
    		d.reject(error);
		});

	return d.promise;

};

var dropUser = function (userName) {

	var d = Q.defer();

	var queryText = "DROP USER '" + userName + "'";
	console.log("queryText: " + queryText);

	mysqlManager.executeQuery(queryText)
		.then(function(result){
			d.resolve();
		})
		.catch(function(error){
    		d.reject(error);
		});

	return d.promise;

};

var createCredentials = function (binding) {

	var credentials;

	var uri = "mysql://" + binding.username + ":" + binding.password + "@" + process.env.MYSQL_HOST + ":" + process.env.MYSQL_PORT + "/" + binding.schema;

	credentials = 
		{
			credentials : 
				{
					uri: uri,
					username: binding.username,
					password: binding.password,
					host: process.env.MYSQL_HOST,
					port: process.env.MYSQL_PORT,
					database: binding.schema
				}
		};

	return credentials

};

exports.save = function(binding) {

	var d = Q.defer();

	bindExists(binding)
		.then(createUser)
		.then(grantPrivilege)
		.then(flushPrivilege)
		.then(function (resultBinding){
			d.resolve(createCredentials(resultBinding));
		})
		.catch(function(error){
			if (error.http_code) 
			{
				d.reject(error);
			}
			else
			{
				var err = new Error();
				err.message = JSON.stringify({description: error.message});
				err.http_code = 500;
				d.reject(err);
			}
		});

	return d.promise;
};


exports.destroy = function(binding) {

	var d = Q.defer();

	userExists(binding.username)
		.then(dropUser)
		.then(function(result){
			d.resolve({});
		})
		.catch(function(error){
			if (error.http_code) 
			{
				d.reject(error);
			}
			else
			{
				var err = new Error();
				err.message = JSON.stringify({description: error.message});
				err.http_code = 500;
				d.reject(err);
			}
		});

	return d.promise;
};