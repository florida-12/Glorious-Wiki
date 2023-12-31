const express = require('express');
const path = require('path');
const app = express();


app.use(express.static(path.join(__dirname, 'assets')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));


app.get('/', (req, res) => {
    res.render('home');
});

app.get('/classes', (req, res) => {
    res.render('classes');
});


const PORT = process.env.PORT || 80;
app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});