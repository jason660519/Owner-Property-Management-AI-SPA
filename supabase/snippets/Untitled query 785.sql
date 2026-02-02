 UPDATE auth.users                                                               
  SET encrypted_password = crypt('!qaz2wsx3edC', gen_salt('bf'))                
  WHERE email = 'a0405142777@gmail.com';         