const express = require('express');
const path = require('path');
const fs = require('fs/promises');
const app = express();

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

app.use(express.static(path.join(__dirname, 'assets')));

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


const PORT = process.env.PORT || 80;
app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});