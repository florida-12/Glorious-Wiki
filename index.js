const express = require('express');
const path = require('path');
const fs = require('fs/promises');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const app = express();


require('dotenv').config();

const db = new sqlite3.Database('database.db');
db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS items (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, image TEXT, rarity TEXT, level INTEGER, data TEXT);");
    db.run("CREATE TABLE IF NOT EXISTS classes (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, name_ru TEXT);");
    db.run("CREATE TABLE IF NOT EXISTS item_classes (item_id INTEGER, class_id INTEGER, PRIMARY KEY (item_id, class_id), FOREIGN KEY (item_id) REFERENCES items(id), FOREIGN KEY (class_id) REFERENCES classes(id));");
});

let footer_html;
fs.readFile(path.join(__dirname, 'views/footer.ejs'), 'utf-8')  // Чтение содержимого файла при запуске сервера
    .then(content => {
        footer_html = content;
    })
    .catch(error => {
        console.error('Error reading file:', error);
        process.exit(1);  // Выход с кодом ошибки, если чтение не удалось
    }
    );

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'media/items/');
    },
    filename: function (req, file, cb) {
        const extension = path.extname(file.originalname);
        const uniqueFilename = uuidv4() + extension;
        cb(null, uniqueFilename);
    }
});

const upload = multer({ storage: storage });

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'assets')));

app.use((req, res, next) => {
    req.body = removeEmptyFields(req.body);
    next();
});

function removeEmptyFields(obj) {
    return Object.fromEntries(
        Object.entries(obj).filter(([key, value]) => value !== '' && value !== null && value !== undefined)
    );
}

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));


app.get('/', (req, res) => {
    res.render('home', { footer: footer_html });
});

app.get('/classes', (req, res) => {
    res.render('classes', { footer: footer_html });
});

app.get('/classes/warrior', (req, res) => {
    res.render('classes/warrior', { footer: footer_html });
});

app.get('/classes/archer', (req, res) => {
    res.render('classes/archer', { footer: footer_html });
});

app.get('/classes/paladin', (req, res) => {
    res.render('classes/paladin', { footer: footer_html });
});

app.get('/classes/thief', (req, res) => {
    res.render('classes/thief', { footer: footer_html });
});

app.get('/items', (req, res) => {
    if (req.query.level == 'above') {
        db.all("SELECT * FROM items ORDER BY -level;", (err, rows) => {
            if (err) {
                return res.status(500).send("Error retrieving data from database.");
            }

            res.render('items', { items: rows, url: req.url, footer: footer_html });
        });
    } else if (req.query.level == 'below') {
        db.all("SELECT * FROM items ORDER BY level;", (err, rows) => {
            if (err) {
                return res.status(500).send("Error retrieving data from database.");
            }

            res.render('items', { items: rows, url: req.url, footer: footer_html });
        });
    } else {
        db.all("SELECT * FROM items;", (err, rows) => {
            if (err) {
                return res.status(500).send("Error retrieving data from database.");
            }

            res.render('items', { items: rows, url: req.url, footer: footer_html });
        });
    }
});

app.get('/items/add', (req, res) => {
    res.render('add-item', { footer: footer_html });
});

app.post('/items/add', (req, res) => {
    if (req.body.password != process.env.PASSWORD.toString()) return res.redirect('/items/add');

    const { name, rarity, level, classes } = req.body;
    delete req.body.name; delete req.body.rarity; delete req.body.level; delete req.body.classes; delete req.body.password;
    let data = JSON.stringify(req.body);

    const insertItemStatement = db.prepare("INSERT INTO items (name, image, rarity, level, data) VALUES (?, ?, ?, ?, ?)");
    insertItemStatement.run(name, null, rarity, level, data, function (err) {
        if (err) {
            return res.status(500).send("Error inserting item into database.");
        }

        const itemId = this.lastID;

        // Вставляем выбранные классы в таблицу item_classes
        if (classes && classes.length > 0) {
            const insertClassStatement = db.prepare("INSERT INTO item_classes (item_id, class_id) VALUES (?, (SELECT id FROM classes WHERE name = ?))");
            classes.forEach(className => {
                insertClassStatement.run(itemId, className, function (err) {
                    if (err) {
                        console.error("Error inserting class for item into database:", err);
                    }
                });
            });
            insertClassStatement.finalize();
        }

        res.redirect(`/items/add/image/${itemId}/`);
    });
    insertItemStatement.finalize();
});

app.get('/items/add/image/:id', (req, res) => {
    db.all(`SELECT name FROM items WHERE id = ${req.params.id};`, (err, rows) => {
        if (err) {
            return res.status(500).send("Error retrieving data from database.");
        }

        res.render('add-item-image', { items: rows });
    });
});

app.post('/items/add/image/:id', upload.single('image'), (req, res) => {
    if (req.body.password != process.env.PASSWORD.toString()) return res.redirect('/items/add');
    if (!req.file) return res.status(400).send('No file uploaded.');

    const image = req.file.filename;

    const updateStatement = db.prepare("UPDATE items SET image = ? WHERE id = ?");
    updateStatement.run(image, req.params.id, function (err) {
        if (err) {
            return res.status(500).send("Error updating item in the database.");
        }

        res.redirect('/items/add')
    });
    updateStatement.finalize();
});

app.get('/items/edit/image/:id', (req, res) => {
    db.all(`SELECT name, image FROM items WHERE id = ${req.params.id};`, (err, rows) => {
        if (err) {
            return res.status(500).send("Error retrieving data from database.");
        }

        res.render('edit-item-image', { items: rows });
    });
});

app.post('/items/edit/image/:id', upload.single('image'), (req, res) => {
    if (req.body.password != process.env.PASSWORD.toString()) return res.redirect('/items/add');
    if (!req.file) return res.status(400).send('No file uploaded.');

    const image = req.file.filename;

    db.all(`SELECT image FROM items WHERE id = ${req.params.id};`, (err, rows) => {
        if (err) {
            return res.status(500).send("Error");
        }

        fs.unlink(path.join(__dirname, `media/items/${rows[0].image}`), (err) => {
            if (err) {
                console.error(err)
                return res.status(500).send("Error");
            }
        })
    });

    const updateStatement = db.prepare("UPDATE items SET image = ? WHERE id = ?");
    updateStatement.run(image, req.params.id, function (err) {
        if (err) {
            return res.status(500).send("Error updating item in the database.");
        }

        res.redirect('/items')
    });
    updateStatement.finalize();
});

app.get('/items/:id', (req, res) => {
    db.get(`SELECT * FROM items WHERE id = ${req.params.id} LIMIT 1;`, (err, item) => {
        if (err) {
            return res.status(500).send("Error retrieving data from database.");
        }

        if (!item) {
            return res.status(404).send("Item not found.");
        }

        db.all(`SELECT classes.* FROM item_classes 
                INNER JOIN classes ON item_classes.class_id = classes.id 
                WHERE item_classes.item_id = ${req.params.id};`, (err, classes) => {
            if (err) {
                return res.status(500).send("Error retrieving data from database.");
            }
            
            res.render('item', { item: item, classes: classes });
        });
    });
});

app.get('/media/items/:imageName', async (req, res) => {
    const imageName = req.params.imageName;
    const imagePath = path.join(__dirname, 'media/items', imageName);

    try {
        await fs.access(imagePath);
        res.sendFile(imagePath);
    } catch (error) {
        res.status(404).send('Image not found.');
    }
});


const PORT = process.env.PORT || 80;
app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});