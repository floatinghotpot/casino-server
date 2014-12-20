
exports = module.exports = {
	isUserId: function(str) {
		return str && (typeof str === 'string') && /^[A-Za-z0-9_]{1,20}$/.test(str);
	},
	isPassword: function(str) {
		return str && (typeof str === 'string') && /^[A-Za-z0-9!@#$%^&*()_]{6,20}$/.test(str);
	},
	isPhoneNumber: function(str) {
		return str && (typeof str === 'string') && /^[0-9\+]{3,20}$/.test(str);
	},
	isEmail: function(str) {
		return str && (typeof str === 'string') && /^([\w-]+(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i.test(str);
	}
};
