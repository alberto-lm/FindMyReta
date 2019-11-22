let express = require ('express');
let morgan = require ('morgan');
let bodyParser = require( "body-parser" );
let mongoose = require('mongoose');
let multer = require("multer");
let GridFsStorage = require("multer-gridfs-storage");
let Grid = require("gridfs-stream");
let crypto = require("crypto");
let path = require('path');
let app = express();
let jsonParser = bodyParser.json();
let {PlaceList} = require('./models');
let {DATABASE_URL, PORT} = require('./config');
let mongoURI = "mongodb+srv://root:root@cluster0-znoye.mongodb.net/RetasDB?retryWrites=true&w=majority";

app.use(express.static('public'));
app.use( morgan( 'dev' ) );
mongoose.Promise = global.Promise;


let conn = mongoose.createConnection(mongoURI);
let gfs;

conn.once('open', () => {
    gfs = Grid(conn.db, mongoose.mongo);
    gfs.collection("retas");
    console.log("Connection Successful");
});


app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

// Create storage engine
const storage = new GridFsStorage({
    url: mongoURI,
    file: (req, file) => {
      return new Promise((resolve, reject) => {
        crypto.randomBytes(16, (err, buf) => {
          if (err) {
            return reject(err);
          }
          const filename = buf.toString('hex') + path.extname(file.originalname);
          const fileInfo = {
            filename: filename,
            bucketName: "retas"
          };
          resolve(fileInfo);
        });
      });
    }
  });
  
const upload = multer({ storage });


app.get('/api/allRetas', ( req, res, next ) => {
    console.log("Getting retas in Server");
	PlaceList.get()
		.then( retas => {
			return res.status( 200 ).json( retas );
		})
		.catch( error => {
			res.statusMessage = "Something went wrong with the DB. Try again later.";
			return res.status( 500 ).json({
				status : 500,
				message : "Something went wrong with the DB. Try again later."
			})
		});
});

app.post('/api/postPlace', jsonParser, (req, res) => {
    console.log("Posting new place");
    let location = req.body.address;
    let typeOfSports = req.body.typeOfSports;
    let cost = req.body.cost;
    let requisites = req.body.requisites;
    let nowPlaying = req.body.nowPlaying;
    let image = req.body.imageURL;
    console.log(location);
    console.log(typeOfSports);
    console.log(cost);
    if(!location || !typeOfSports || !cost){
        res.statusMessage = "Missing field in place form";
        return res.status(406).json({
           "error" : "Missing field",
           "status" : 406
        });
    }
     let newPlace = {
         location,
         typeOfSports,
         cost,
         requisites,
         image,
         nowPlaying
     };
     PlaceList.post(newPlace)
        .then(place => {
            res.status(201).json(place);
        })
        .catch(err => {
            res.statusMessage = "Something went wrong";
            return res.status(501).json({
                "error" : "Something went wrong with the data base",
                "status" : 501
            });
        });
});

app.post('/api/uploadImage', upload.single('file'), jsonParser, (req, res, err) => {
    res.json({file : req.file });

    let location = req.body.location;
    let typeOfSports = req.body.typeOfSports;
    let cost = req.body.cost;
    let requisites = req.body.requisites;
    let image = "dummy";
    let nowPlaying = req.body.nowPlaying;
    if(!location || !typeOfSports || !cost || !image){
        res.statusMessage = "Missing field in place form";
        return res.status(406).json({
           "error" : "Missing field",
           "status" : 406
        });
    }
     let newPlace = {
         location,
         typeOfSports,
         cost,
         requisites,
         image,
         nowPlaying
     };
     PlaceList.post(newPlace)
        .then(place => {
            res.status(201).json(place);
        })
        .catch(err => {
            res.statusMessage = "Something went wrong";
            return res.status(501).json({
                "error" : "Something went wrong with the data base",
                "status" : 501
            });
        });
})

app.put('/api/updatePlace/:id', jsonParser, (req, res, next) => {
    let filterID = req.params.id;
    if(!filterID || !req.body){
        res.statusMessage = "Missing field id";
        return res.status(406).json({
           "error" : "Missing id",
           "status" : 406
       });
    }
    PlaceList.put({ id : filterID }, req.body)
       .then(place => {
           res.status(201).json(place);
       })
       .catch(err => {
           res.statusMessage = "Missing field in body";
           return res.status(500).json({
               "error" : "Something went wrong with the data base",
               "status" : 500
           });
       });
});

app.delete('/api/deletePlace/:id', (req, res) => {
    let filterID = req.params.id;
    if(!filterID){
        res.statusMessage = "Missing field id";
        return res.status(406).json({
           "error" : "Missing id",
           "status" : 406
       });
    }
    PlaceList.delete({ id : filterID })
       .then(blog => {
           res.status(201).json(blog);
       })
       .catch(err => {
           res.statusMessage = "Missing field in body";
           return res.status(500).json({
               "error" : "Something went wrong with the data base",
               "status" : 500
           });
       });
});


let server;

function runServer(port, databaseUrl){
    return new Promise( (resolve, reject ) => {
    mongoose.connect(databaseUrl, response => {
    if ( response ){
        return reject(response);
    }
    else{
        server = app.listen(port, () => {
        console.log( "App is running on port " + port );
        resolve();
    })
        .on( 'error', err => {
        mongoose.disconnect();
        return reject(err);
    })
    }
    });
    });
}
   
function closeServer(){
    return mongoose.disconnect()
            .then(() => {
    return new Promise((resolve, reject) => {
    console.log('Closing the server');
    server.close( err => {
        if (err){
            return reject(err);
        }
        else{
            resolve();
        }});
    });
    });
   }
   
runServer( PORT, DATABASE_URL )
    .catch( err => {
    console.log( err );
});
   
module.exports = { app, runServer, closeServer };