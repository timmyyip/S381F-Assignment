const express = require('express');
const session = require('cookie-session');
const bodyParser = require('body-parser');
const app = express();
//Generate id
const uuid = require('uuid');
//File Upload
const fs = require('fs');
const formidable = require('formidable');
//Database
const MongoClient = require('mongodb').MongoClient; 
const assert = require('assert');
const mongourl = 'mongodb+srv://timmy:Timmy951@cluster0.l7wrd.mongodb.net/test?retryWrites=true&w=majority&useUnifiedTopology=true';
const dbName = 'test'; 
const client = new MongoClient(mongourl);

app.set('view engine','ejs');

const SECRETKEY = 'I want to pass COMPS381F';

const users = new Array(
	{name: 'student', password: ''},
	{name: 'demo', password: ''}
);

app.set('view engine','ejs');

app.use(session({
  name: 'loginSession',
  keys: [SECRETKEY]
}));

// support parsing of application/json type post data
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


//CRUD Method
//Select
const findRestaurants = (db, criteria, callback) => {
	//console.log(criteria);
	if (criteria != null) {
   		var cursor = db.collection('restaurant').find(criteria);
	}
	else {
		var cursor = db.collection('restaurant').find();
	}
	cursor.toArray((err,docs) => {
		assert.equal(err,null);
		callback(docs);
	})
};

//Create
const createRestaurant = (db, doc, callback) => {
    db.collection('restaurant').insertOne(doc, (err, results) => {
	assert.equal(err,null);
	callback();
    });
};

app.get('/', (req,res) => {
	console.log(req.session);
	if (!req.session.authenticated) {    // user not logged in!
		res.redirect('/login');
	}else{
		res.redirect('/menu');
	}
});

app.get('/login', (req,res) => {
	res.status(200).render('login',{error:true});
});

app.post('/login', (req,res) => {
	users.forEach((user) => {
		if (user.name == req.body.name && user.password == req.body.password) {
			// correct user name + password
			// store the following name/value pairs in cookie session
			req.session.authenticated = true;        // 'authenticated': true
			req.session.username = req.body.name;	 // 'username': req.body.name		
		
	}});
	if(!req.session.authenticated){
		res.render('login',{error:req.session.authenticated});
	}else{
		res.redirect('/menu');
	}
});

app.get('/logout', (req,res) => {
	req.session = null;   // clear cookie-session
	res.redirect('/');
});

app.get('/menu', (req,res) => {
	if (!req.session.authenticated) {    
		res.redirect('/login');
	} else {
		client.connect((err) => {
			assert.equal(null, err);
			console.log("Connected successfully to server");
			const db = client.db(dbName);
			findRestaurants(db, null, (restaurantList) => {
			//client.close();
	            	//console.log("Closed DB connection");
			res.render("menu", {restaurantList: restaurantList, 				name:req.session.username, query:""});
  			});
		});
	}
});

app.post('/menu', (req,res) => {
	if (!req.session.authenticated) {    
		res.redirect('/login');
	} else {
		client.connect((err) => {
			assert.equal(null, err);
			console.log("Connected successfully to server");
			const db = client.db(dbName);
			console.log(req.body);
			var query = {};
			if(req.body.name != null && req.body.name != "")
				query['name']=req.body.name;
			if(req.body.borough != null && req.body.borough != "")
				query['borough']=req.body.borough;
			if(req.body.cuisine != null && req.body.cuisine != "")
				query['cuisine']=req.body.cuisine;			
			findRestaurants(db, query, (restaurantList) => {
			//client.close();
	            	//console.log("Closed DB connection");
			res.render("menu", {restaurantList: restaurantList, 				name:req.session.username, query:JSON.stringify(query)});
  			});
		});
	}
});

app.get('/create', (req,res) => {
	if (!req.session.authenticated) {    
		res.redirect('/login');
	} else {
		res.render("create");
	}
});

app.post('/create', (req,res) => {
	if (!req.session.authenticated) {    
		res.redirect('/login');
	} else {
		let doc = {};
 		const form = new formidable.IncomingForm();
		form.parse(req, (err, fields, files) => {
		        if (files.filetoupload && files.filetoupload.size > 0) {
			fs.readFile(files.filetoupload.path, (err,data) => {
		                assert.equal(err,null);
			doc = {
				 //"restaurant_id":restaurant_id, 
				 "name": fields.name,
				 "borough":fields.borough,
				 "cuisine": fields.cuisine,
				 "photo": new Buffer.from(data).toString('base64'),
				 "photo_mimetype": files.filetoupload.type,
				 "address":{
					street: fields.street,
					building:fields.building,
					zipcode:fields.zipcode,
					coord:[fields.lon,fields.lat], 
					},
				 "grades":[],
				 "owner":req.session.username
				};
		            

			})
		        }else{
				doc = {
				 "name": fields.name,
				 "borough":fields.borough,
				 "cuisine": fields.cuisine,
				 "photo":"",
				 "photo_mimetype": "",
				 "address":{
					street: fields.street,
					building:fields.building,
					zipcode:fields.zipcode,
					coord:[fields.lon,fields.lat], 
					},
				 "grades":[],
				 "owner":req.session.username
				};
		            
			}
		});
		client.connect((err) => {
		    assert.equal(null, err);
		    console.log("Connected successfully to server");
		    const db = client.db(dbName);
		    doc["restaurant_id"] = uuid.v4();	
		    createRestaurant(db, doc, () => {
			    res.redirect("/view?restaurant_id="+doc["restaurant_id"]);
		    });
		});
		
	}
});

app.get('/view', (req,res) => {	
	if (!req.session.authenticated) {    
		res.redirect('/login');
	} else {
		client.connect((err) => {
			assert.equal(null, err);
			console.log("Connected successfully to server");
			const db = client.db(dbName);
			findRestaurants(db, req.query, (restaurantDetail) => {
			res.render("view", {restaurantDetail: restaurantDetail});
			});
		});
	}
});

app.get('/edit', (req,res) => {	
	if (!req.session.authenticated) {    
		res.redirect('/login');
	} else {
		client.connect((err) => {
			assert.equal(null, err);
			console.log("Connected successfully to server");
			const db = client.db(dbName);
			findRestaurants(db, req.query, (restaurantDetail) => {
			console.log(restaurantDetail);
			res.render("edit", {restaurantDetail: restaurantDetail,username:req.session.username});						
			});
		});
	}
});


app.post('/edit', (req,res) => {
	if (!req.session.authenticated) {    
		res.redirect('/login');
	} else {
		let doc = {};
		let query = {};
 		const form = new formidable.IncomingForm();
		form.parse(req, (err, fields, files) => {
			query = {"restaurant_id":fields.restaurant_id};
		        if (files.filetoupload && files.filetoupload.size > 0) {
			fs.readFile(files.filetoupload.path, (err,data) => {
		                assert.equal(err,null);
			doc = {
				 "name": fields.name,
				 "borough":fields.borough,
				 "cuisine": fields.cuisine,
				 "photo": new Buffer.from(data).toString('base64'),
				 "photo_mimetype": files.filetoupload.type,
				 "address":{
					street: fields.street,
					building:fields.building,
					zipcode:fields.zipcode,
					coord:[fields.lon,fields.lat], 
					},
				 "owner":req.session.username
				};
		            

			})
		        }else{
				doc = {
				 "name": fields.name,
				 "borough":fields.borough,
				 "cuisine": fields.cuisine,
				 "address":{
					street: fields.street,
					building:fields.building,
					zipcode:fields.zipcode,
					coord:[fields.lon,fields.lat], 
					},
				 "owner":req.session.username
				};
		            
			}
		});
		client.connect((err) => {
		    assert.equal(null, err);
		    console.log("Connected successfully to server");
         	    var newvalues = { $set: doc };
		    const db = client.db(dbName);
		    db.collection("restaurant").updateOne(query, newvalues, function(err, res) { if (err) throw err;});
		    res.redirect("/view?restaurant_id="+query.restaurant_id);
		});
		
	}
});

app.get('/rate', (req,res) => {	
	if (!req.session.authenticated) {    
		res.redirect('/login');
	} else {
		res.render("rate", {restaurant_id:req.body.restaurant_id});
	}
});

app.get('/error', (req,res) => {	
	if (!req.session.authenticated) {    
		res.redirect('/login');
	} else {
		res.render("error");
	}
});



app.post('/rate', (req,res) => {		
       	client.connect((err) => {
	    assert.equal(null, err);
	    console.log("Connected successfully to server");
	    const query = {"restaurant_id":req.query.restaurant_id};
	    const db = client.db(dbName);
	    findRestaurants(db, query, (restaurantDetail) => {
	    var error = false;
	    if(restaurantDetail[0].grades!=null && restaurantDetail[0].grades != ""){
	    for (i = 0; i < restaurantDetail[0].grades.length; i++) {
		if (req.session.username == restaurantDetail[0].grades[i].grade.user)
			error = true;
	    }}
		if(error){
			res.redirect('/error');
		}else{
		    const doc = {
				  "grade":{
					"user":req.session.username,
					"score":req.body.score
					}
				};
		    var newvalues = { $push: {"grades":doc} };
		    db.collection("restaurant").updateOne(query, newvalues, function(err, res) { if (err) throw err;});
		    res.redirect("/view?restaurant_id="+req.query.restaurant_id);
		}
	    });
	});
});

app.get("/map", (req,res) => {
	res.render("map.ejs", {
		lat:req.query.lat,
		lon:req.query.lon,
		zoom:req.query.zoom ? req.query.zoom : 15
	});
});

app.get("/delete", (req,res) => {
	var err = false;
    	client.connect((err) => {
	    assert.equal(null, err);
	    console.log("Connected successfully to server");
	    const db = client.db(dbName);
	    findRestaurants(db, req.query, (restaurantDetail) => {
		if(restaurantDetail[0].owner != req.session.username){
			err = true;
		}
		if(!err){	  						 
			db.collection("restaurant").deleteOne(req.query, function(err, obj) {
		   		if (err) throw err;
		       });		
		}
		res.render("delete", {error:err});
	    });
	});
});

//RESTful GET

app.get('/api/restaurant/name/:name', (req,res) => {
	if (!req.session.authenticated) {    
		res.redirect('/login');
	} else {		
		client.connect((err) => {
			assert.equal(null, err);
			console.log("Connected successfully to server");
			const db = client.db(dbName);
			var query = {"name":req.params.name};
			findRestaurants(db, query, (restaurantList) => {
				res.status(200).json(restaurantList).end();
  			});
		});
	}
});

app.get('/api/restaurant/borough/:borough', (req,res) => {
	if (!req.session.authenticated) {    
		res.redirect('/login');
	} else {		
		client.connect((err) => {
			assert.equal(null, err);
			console.log("Connected successfully to server");
			const db = client.db(dbName);
			var query = {"borough":req.params.borough};
			findRestaurants(db, query, (restaurantList) => {
				res.status(200).json(restaurantList).end();
  			});
		});
	}
});

app.get('/api/restaurant/cuisine/:cuisine', (req,res) => {
	if (!req.session.authenticated) {    
		res.redirect('/login');
	} else {		
		client.connect((err) => {
			assert.equal(null, err);
			console.log("Connected successfully to server");
			const db = client.db(dbName);
			var query = {"cuisine":req.params.cuisine};
			findRestaurants(db, query, (restaurantList) => {
				res.status(200).json(restaurantList).end();
  			});
		});
	}
});


app.listen(process.env.PORT || 8099);
