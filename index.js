const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const db = require('./db');
const { format } = require('date-fns'); // A lightweight date formatting library

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: false }));

// Route: Home page (Add student)
app.get('/', (req, res) => {
    res.render('index');
});

// Route: Add Student Form Submission
app.post('/add-student', async (req, res) => {
    const { name, roll_number, student_id, mobile_number, email_id } = req.body;

    try {
        await db.execute(
            `INSERT INTO students (name, roll_number, student_id, mobile_number, email_id) 
             VALUES (?, ?, ?, ?, ?)`,
            [name, roll_number, student_id, mobile_number, email_id]
        );
        res.redirect('/students');
    } catch (err) {
        console.error(err);
        res.send('Error adding student.');
    }
});

// Route: Display Students
app.get('/students', async (req, res) => {
    try {
        const [students] = await db.execute('SELECT * FROM students');
        res.render('students', { students });
    } catch (err) {
        console.error(err);
        res.send('Error fetching students.');
    }
});

// Route: Attendance Page
app.get('/attendance', async (req, res) => {
    try {
        // SQL query to fetch students and order by roll_number in ascending order
        const [students] = await db.execute('SELECT roll_number, name, student_id FROM students ORDER BY roll_number ASC');
        res.render('attendance', { students });
    } catch (err) {
        console.error(err);
        res.send('Error loading attendance page.');
    }
});


// submit attendance route
app.post('/submit-attendance', async (req, res) => {
    console.log('Request Body:', req.body);

    try {
        const rawAttendance = req.body;
        if (!rawAttendance || Object.keys(rawAttendance).length === 0) {
            return res.status(400).send('No attendance data provided.');
        }

        // Parse raw attendance data
        const attendanceData = [];
        const currentDate = new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'

        Object.keys(rawAttendance).forEach((key) => {
            const match = key.match(/attendance\[(\d+)\]\[(\w+)\]/);
            if (match) {
                const studentId = match[1];
                const field = match[2]; // 'status' or 'roll_number'
                
                if (!attendanceData[studentId]) {
                    attendanceData[studentId] = { student_id: studentId, date: currentDate };
                }
                attendanceData[studentId][field] = rawAttendance[key];
            }
        });

        // Transform attendanceData into an array of values for SQL insertion
        const attendanceRecords = Object.values(attendanceData).map((record) => {
            if (!record.status || !['Present', 'Absent'].includes(record.status)) {
                throw new Error('Invalid attendance status');
            }
            return [record.student_id, record.roll_number, record.date, record.status];
        });

        // Save the attendance records in the database
        const sql = `INSERT INTO attendance (student_id, roll_number, date, status) VALUES ?`;
        await db.query(sql, [attendanceRecords]);
        res.render('att-submit');
    } catch (err) {
        console.error('Error:', err);
        res.status(500).send('Error saving attendance.');
    }
});


// Route: Teacher View Attendance

// Route: View Attendance with optional date filter
app.get('/view-attendance', async (req, res) => {
    const { date } = req.query; // Get the date from query parameters

    try {
        let query = `
            SELECT attendance.date, students.name, attendance.roll_number, attendance.status
            FROM attendance
            INNER JOIN students ON attendance.student_id = students.student_id
        `;
        let params = [];

        // Filter by date if provided
        if (date) {
            query += ` WHERE attendance.date = ?`;
            params.push(date);
        }

        query += ` ORDER BY attendance.date DESC, attendance.roll_number ASC`;
        const [attendance] = await db.execute(query, params);

        // Format dates in the attendance records
        attendance.forEach((record) => {
            record.date = format(new Date(record.date), 'yyyy-MM-dd'); // Convert to YYYY-MM-DD format
        });

        // Pass the selected date and attendance data to the template
        const selectedDate = date ? format(new Date(date), 'yyyy-MM-dd') : '';
        res.render('view-attendance', { attendance, selectedDate });
    } catch (err) {
        console.error(err);
        res.send('Error loading attendance records.');
    }
});




// Start the server
app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});
