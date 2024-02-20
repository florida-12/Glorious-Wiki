const sqlite3 = require('sqlite3').verbose();


const db = new sqlite3.Database('database.db');
db.serialize(() => {
    db.run("INSERT INTO classes (name, name_ru) VALUES ('warrior', 'воин');");
    db.run("INSERT INTO classes (name, name_ru) VALUES ('paladin', 'паладин');");
    db.run("INSERT INTO classes (name, name_ru) VALUES ('archer', 'лучник');");
    db.run("INSERT INTO classes (name, name_ru) VALUES ('thief', 'вор');");
    db.run("INSERT INTO classes (name, name_ru) VALUES ('mage', 'маг');");
});