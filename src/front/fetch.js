export const login = async(email, password, dispatch) => {
    const options = {
        method: 'POST',
        mode: 'cors',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            email: email,
            password: password
        })
    }

    const response = await fetch('https://animated-eureka-5grpx4q7wvpgf66g-3001.app.github.dev/api/token', options)

    try {
        if (!response.ok) {
            throw new Error(response.status)
        }
        const data = await response.json()
        dispatch()
    }
    catch {
        
    }
}