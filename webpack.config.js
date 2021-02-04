const path = require('path');
// const htmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
	mode: 'development',

	entry: './src/index.js',

	output: {
		path: path.resolve(process.cwd(), './lib'),
		filename: 'cascader.js',
		library: 'Cascader', // 模块名称
		libraryExport: 'default', // Cascader.default
		libraryTarget: 'umd',
	},

	externals: {
		jquery: {
			commonjs: 'jquery',
			commonjs2: 'jquery',
			amd: 'jquery',
			root: '$',
		},
	},

	module: {
		rules: [
			{
				test: /\.m?js$/,
				exclude: /(node_modules|bower_components)/,
				use: {
					loader: 'babel-loader',
					options: {
						presets: ['@babel/preset-env'],
					},
				},
			},
			{
				test: /\.(c|le)ss$/i,
				use: ['style-loader', 'css-loader', 'less-loader'],
			},
			{
				test: /\.(png|jpe?g|gif|svg)$/i,
				use: [
					{
						loader: 'url-loader',
					},
					// {
					// 	loader: 'file-loader',
					// },
				],
			},
		],
	},

	// plugins: [new htmlWebpackPlugin({ template: './index.html' })],
};
