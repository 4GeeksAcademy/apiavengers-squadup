export const initialStore=()=>{
  return{
    message: null,
    access_token: null,
    isLoginSuccessful: false,
    isLoggedIn: false,
    isSignUpSuccessful: false,
    todos: [
      {
        id: 1,
        title: "Make the bed",
        background: null,
      },
      {
        id: 2,
        title: "Do my homework",
        background: null,
      }
    ]
  }
}

export default function storeReducer(store, action = {}) {
  switch(action.type) {
    case 'set_hello':
      return {
        ...store,
        message: action.payload
      };
      
    case 'add_task':
      const { id, color } = action.payload;
      return {
        ...store,
        todos: store.todos.map((todo) => 
          todo.id === id ? { ...todo, background: color } : todo
        )
      };
    
    case 'fetchedToken': {
      const { message, token, isLoginSuccessful, loggedIn } = action.payload;
      return {
        ...store,
        message: message,
        access_token: token,  
        isLoginSuccessful: isLoginSuccessful,
        isLoggedIn: loggedIn, 
      };
    }
    
    case 'loggedOut': {
      return {
        ...store,
        message: null,
        access_token: null, 
        isLoginSuccessful: false,
        isLoggedIn: false,  
      };
    }
    
    default:
      return store; 
  }    
}