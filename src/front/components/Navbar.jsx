import { Link } from "react-router-dom";
import { logout } from "../fetch";
import useGlobalReducer from "../hooks/useGlobalReducer";
import { useNavigate } from "react-router-dom";


export const Navbar = () => {
	const { dispatch } = useGlobalReducer();
	const navigate = useNavigate();
	const { store } = useGlobalReducer();

	const handleLogout = () => {
		logout(dispatch);
		navigate('/');
	};

	return (
		<nav className="navbar navbar-light bg-light">
			<div className="container">
				<Link to="/">
					<span className="navbar-brand mb-0 h1">SquadUP</span>
				</Link>
				<div className="ml-auto">
					{!store.isLoggedIn ? (
						<Link to="/login">
							<button className="btn btn-primary">Login</button>
						</Link>
					) : (
						<button className="btn btn-primary" onClick={handleLogout}>
							Logout
						</button>
					)}
				</div>
			</div>
		</nav>
	);
};