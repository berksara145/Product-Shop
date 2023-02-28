const User = require('../models/user');
const crypt = require('bcryptjs')
const crypto = require('crypto')
const nodeMailer = require('nodemailer')
const sendGridTransport = require('nodemailer-sendgrid-transport');
const { userInfo } = require('os');

const api_key = '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'

const transporter = nodeMailer.createTransport(sendGridTransport({
  auth : {
    api_key : api_key
  }
}))

exports.getLogin = (req, res, next) => {
  message = req.flash('error')
  console.log(message)
  res.render('auth/login', {
    path: '/login',
    pageTitle: 'Login',
    errorMessage : message
  });
};

exports.postLogin = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;

  User.findOne( {email: email} )
    .then(user => {
      if(!user){
        req.flash('error', 'Invalid password')
        return res.redirect('/login')
      }
      crypt.compare(password, user.password)
      .then(result => {
        if(result){
          req.session.isLoggedIn = true;
          req.session.user = user;
          return req.session.save(err => {
            console.log(err);
            return res.redirect('/');
          });
        }
        res.redirect('/login')
      })
      .catch(err => {
        console.log(err)
        res.redirect('/login')
      })
    })
    .catch(err => console.log(err));
};

exports.postLogout = (req, res, next) => {
  req.session.destroy(err => {
    console.log(err);
    res.redirect('/');
  });
};

exports.getSignup = (req, res, next) => {
  res.render('auth/signup', {
    path: '/signup',
    pageTitle: 'signup'
  })
}

exports.postSignup = (req, res, next) => {
  const email = req.body.email
  const password = req.body.password
  const confirmPassword = req.body.confirmPassword
  
  User.findOne({email : email})
  .then(user => {
    if(user || password !== confirmPassword){
      return res.redirect('/signup')
    }
    return crypt.hash(password, 12)
    .then(hashedPassword => {
      const newUser = new User({
        email : email,
        password : hashedPassword,
        cart : { items : []}
      });
      return newUser.save()
      .then(result => { 
        res.redirect('/login')
        return transporter.sendMail({
          to: email,
          from : 'berksara155@gmail.com',
          subject : 'Signup process done',
          html: '<h1> You achieved again !! <h1>'
        })   
      });
  })
    })
  .catch(err => console.log(err))
}

exports.getReset = (req, res, next) => {
  res.render('auth/reset', {
    path: '/reset',
    pageTitle: 'reset'
  })
}

exports.postReset = (req, res, next) => {
  crypto.randomBytes(32, (err, buffer) => {
    if(err){
      console.log(err)
      return res.redirect('/reset')
    }
    console.log('1')
    const token = buffer.toString('hex')
    User.findOne( {email: req.body.email} )
    .then( user => {
      console.log('2')
      if(!user){
        console.log('no user')
        return res.redirect('/reset')
      }
      user.resetToken = token;
      user.resetTokenExpiration = Date.now() + 3600000;
      return user.save()
    })
    .then(result => {
      console.log('3')
      transporter.sendMail({
        to: req.body.email,
        from : 'berksara155@gmail.com',
        subject : 'reseting process almost done',
        html: `
          <p> Your new password <p> 
          <p> Click this <a href="http://localhost:3000/reset/${token}"> link </a> <p>
        `
      })
      res.redirect('/')
    })
    .catch(err => {
      console.log(err)
    })
  })
}

exports.getNewPassword = (req, res, next) => {
  const token = req.params.token;
  User.findOne({resetToken : token , resetTokenExpiration : {$gt : Date.now()}})
  .then(user => {
    res.render('auth/new-password', {
      path: '/getNewPassword',
      pageTitle: 'getNewPassword',
      userId: user._id.toString(),
      passwordToken : token
    })
  })
  .catch(err => console.log(err))
}

exports.postNewPassword = (req, res, next) => {
  const newPassword = req.body.password;
  const userId = req.body.userId;
  const token = req.body.token;

  User.findOne( {_id : userId, resetToken : token, resetTokenExpiration: { $gt : Date.now()}} )
  .then(user => {
    if(!user){
      console.log('there is problem in finding user')
      return res.redirect('/reset')
    }
    console.log(user)
    crypt.hash(newPassword, 12)
    .then(hashedPassword => {
      console.log(user)
      user.password = hashedPassword;
      user.resetToken = null;
      user.resetTokenExpiration = undefined;
      return user.save() 
    })
    .then(result => {
      res.redirect('/login')
    })
  })
  .catch(err => console.log(err))
}
