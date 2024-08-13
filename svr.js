const express = require('express')
const dbconfig = require('./config/db.js')
const path = require('path')
const static = require('serve-static')
const fs = require('fs')
const multer = require('multer')

const conn = dbconfig.init()
dbconfig.connect(conn)

const storage = multer.memoryStorage()
const upload = multer({ storage: storage })

const app = express()
app.use(express.urlencoded({extended:true, limit:'10mb'}))
app.use(express.json({limit:'10mb'}))
app.use('/public', static(path.join(__dirname, 'public')))

let user_name = ''
let post_rid = ''

const date_format = (date) => {
    const day = ['일', '월', '화', '수', '목', '금', '토']
    const format = date.getFullYear() + '년 ' + (date.getMonth()+1) + '월 '
                + date.getDate() + '일 ' + day[date.getDay()] + '요일  '
                + date.getHours() + '시 ' + date.getMinutes() + '분'

    return format
}

app.listen('8000', (req, res)=>{
    console.log('8000번 포트 연결됨')
})

app.post('/login', (req, res)=>{
    console.log('Login 호출 됨')

    const pid = req.body.id
    const ppw = req.body.pw

    if (!(pid || ppw || pname)) {
        console.log('ID, PW 을 입력하시오')
        return
    }

    conn.query('SELECT * FROM user WHERE id = ? and password = SHA2(?, 256);',
        [pid, ppw],
        (err, rows)=>{
            if(err) {
                console.log('SQL QUERY FAIL')
                return
            }
            console.log(rows)

            if(rows[0]) {
                user_name = rows[0]['name']
                // res.redirect('/public/sign/init.html')
                res.redirect('/public/blog/main.html')
            }
        }
    ) 
})

app.post('/register', (req, res)=>{
    console.log('Register 호출 됨')

    const pid = req.body.id
    const ppw = req.body.pw
    const pname = req.body.name

    if (!(pid || ppw || pname)) {
        console.log('ID, PW, Name 을 입력하시오')
        return
    }

    conn.query('SELECT * FROM user WHERE id = ?;',
        pid,
        (err, rows)=>{
            if(err) {
                console.log('SQL QUERY FAIL')
                return
            }

            if (rows[0]) {
                console.log('중복된 아이디입니다.')
                return
            }
        }
    )

    conn.query('INSERT INTO user VALUES (?, ?, SHA2(?, 256));',
        [pid, pname, ppw],
        (err, rows)=>{
            if(err) {
                console.log('SQL QUERY FAIL')
                return
            }

            res.redirect('/public/sign/login.html')
        }
    )
})

app.post('/load_post', (req, res)=>{
    console.log('load post 호출 됨')
    
    const resData = {}
    resData.status = "Fail"
    resData.rid = []
    resData.user = []
    resData.title = []
    resData.content = []
    resData.image = []
    resData.date = []

    conn.query('SELECT * FROM post order by date;',
        (err, rows)=>{
            if(err) {
                console.log("SQL QUERY FAIL")
                res.send(resData)
            }

            for(let i=0; i<rows.length; i++) {
                const rid = rows[i]['rid']
                const user = '작성자 : ' + rows[i]['user']
                const title = rows[i]['title']
                const content = rows[i]['content']
                const image = rows[i]['image']
                const date = new Date(rows[i]['date'])               

                resData.status = 'Ok'
                resData.rid.push(rid)
                resData.user.push(user)
                resData.title.push(title)
                resData.content.push(content)
                resData.image.push(image)
                resData.date.push(date_format(date))
            }

            res.send(resData)
        }
    )
})

app.delete('/delete_post', (req, res)=>{
    console.log('delete post 호출 됨')

    const rid = req.body.rid

    conn.query('DELETE FROM post WHERE rid = ? and user = ?',
        [rid, user_name],
        (err, rows)=>{
            console.log(rid, user_name  )
            if(err) {
                console.log('SQL QUERY FAIL')
                return
            }
        }
    )
})

app.post('/posting', upload.single('image'), (req, res)=>{
    console.log('Posting 호출 됨')
    console.log(req.body)

    const title = req.body.title
    const content = req.body.content
    const image = req.file ? req.file.buffer : null
    const date = new Date()

    conn.query('INSERT INTO post (user, title, content, image, date) VALUES (?, ?, ?, ?, ?);',
        [user_name, title, content, image, date],
        (err, rows)=>{
            if(err) {
                console.log("MySQL QUERY FAIL")
                return
            }

            res.redirect('/public/blog/main.html')
        }
    )
})

app.get('/image/:rid', (req, res)=>{
    const rid = req.params.rid

    conn.query('SELECT image FROM post WHERE rid = ?',
        rid,
        (err, rows)=>{
            if(err) {
                console.log("MySQL QUERY FAIL")
                return res.send('Database query failed')
            }

            if(rows.length > 0 && rows[0].image) {
                res.setHeader('Content-Type', 'image/jpeg')
                res.send(rows[0].image)
            } else {
                res.send('Image not found')
            }
        }
    )
})

app.post('/modify', (req, res)=>{
    console.log('modify 호출됨')

    post_rid = req.body.rid
})

app.post('/modify_post', (req, res)=>{
    console.log('modify post 호출됨')

    const resData = {}
    resData.title = []
    resData.content = []

    conn.query('SELECT * FROM post WHERE rid = ?',
        post_rid,
        (err, rows)=>{
            if(err) {
                console.log('MySQL QUERY FAIL')
                return res.send('QUERY FAIL')
            }

            if(rows[0]) {
                resData.title.push(rows[0]['title'])
                resData.content.push(rows[0]['content'])
            }
            return res.send(resData)
        }
    )
})

app.put('/posting_modify', upload.single('image'), (req, res)=>{
    console.log('Posting modify 호출 됨')
    console.log(req.body)

    const title = req.body.title
    const content = req.body.content
    const image = req.file ? req.file.buffer : null
    const date = new Date()

    conn.query('UPDATE post SET title = ?, content = ?, image = ?, date = ? WHERE rid = ?;',
        [title, content, image, date, post_rid],
        (err, rows)=>{
            if(err) {
                console.log("MySQL QUERY FAIL")
                return
            }

            res.redirect('/public/blog/main.html')
        }
    )
})