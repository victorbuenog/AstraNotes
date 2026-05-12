import session from 'express-session'

export function createSessionMiddleware(sessionSecret: string) {
  return session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    name: 'astranotes.sid',
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  })
}
