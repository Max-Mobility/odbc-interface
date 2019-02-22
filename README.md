# ODBC Interface

This repo contains Node.JS code for connecting to a SQL server using ODBC.

## Installation Steps (if applicable)

1. Clone repo
2. Run `npm install`
3. Run `npm start`
4. Visit http://localhost:3000/


## Requirements

* [Node.js](http://nodejs.org/) (8.9.0+)

### Installing node-obdc

```bash
sudo apt-get install unixodbc unixodbc-dev
npm install --save odbc
```

### Installing the Microsoft ODBC Driver

Microsoft's instructions for installing their latest ODBC drivers onto a variety of UNIX-based platforms are [here](https://docs.microsoft.com/en-us/sql/connect/odbc/linux-mac/installing-the-microsoft-odbc-driver-for-sql-server).

Prepare a file for defining the DSN to your database with a temporary file something like this:

```
[MySQLServerDatabase]
Driver      = ODBC Driver 17 for SQL Server
Description = My MS SQL Server
Trace       = No
Server      = USPASDB10
```
    
In that file, leave the 'Driver' line exactly as specified above, except with the correct driver version.  The driver version can be found like this:

```bash
$ ls /opt/microsoft/msodbcsql/lib64/
libmsodbcsql-XX.Y.so.PP.QQ
```

Here XX is the version number to use in the INI file.  Modify the rest of the file as necessary.  Then run the following commands:

```bash
# register the SQL Server database DSN information in /etc/odbc.ini
sudo odbcinst -i -s -f /path/to/your/temporary/dsn/file -l

# check the DSN installation with:
cat /etc/odbc.ini   # should contain a section called [MySQLServerDatabase]
```

Connecting to the server is then done like this:

```js
db.open('DSN=MySQLServerDatabase;UID=myuid;PWD=mypwd;DATABASE=SysproCompanyM')
```

where `myuid` and `mypwd` are of course replaced accordingly.
