Supabase - Now the backend service for Twins

Project URL: https://gkbcdqpkjxdjjgolvgeg.supabase.co
API Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrYmNkcXBranhkampnb2x2Z2VnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczNTY1OTQsImV4cCI6MjA3MjkzMjU5NH0.1vN3V6uGpmtVdo1GvMPUYOXtT_e96gnOrxJNaebbf98

Javascript connetion example: 

```javascript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://gkbcdqpkjxdjjgolvgeg.supabase.co'
const supabaseKey = process.env.SUPABASE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)
```

# Current schema 
## schema: public
### Enum types
- age_group [<18, 18-24, 25-34, 35-44, 45+], 
- gender  [Male, Female, Non-Binary, Prefer not to say]
### Table: 
#### User 
Fields:
    - id int8
    - created_at timestampz default now()
    - age int2
    - personality_fingerprint float4
    - email varchar
    - username varchar
    - password varchar
(db adjustment are needed)
