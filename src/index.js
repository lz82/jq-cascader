import $ from 'jquery';
import './index.less';

export default class Cascader {
	constructor({ container, data = [], selectFn = () => {}, placeholder = '搜索或点击下拉选择', value = '' }) {
		// 如果提供了父容器，则挂载
		if (container) {
			this.container = $(container);
		}

		// 数据源
		this.data = data;
		// 选择后的回调函数
		this.selectFn = selectFn;
		this.placeholder = placeholder;

		// dom
		this.$el = undefined;
		// 是否加载初始化数据
		this.initData = false;
		// 是否加载初始化搜索数据
		this.initSearchData = false;
		// 搜索数据label列表
		this.searchLabelArr = [];
		// 搜索数据value列表
		this.searchValueArr = [];
		this.searActiveArr = [];
		// 当前层级
		this.level = 0;
		// 当前数组
		this.curArr = [];
		// 当前选择值
		this.result = { value: '', label: '' };
		// 初始值
		this.value = value;
		// 调用初始化方法
		this.init();
	}

	// 初始化
	init() {
		this.$el = $(`<div class="ui-cascader">
									<div class="ui-cascader-input">
										<span class="arrow"></span>
										<input autocomplete="off" class="searchtxt" type="text" placeholder="${this.placeholder}" />
									</div>
								</div>`);
		if (this.container) {
			this.container.html('');
			this.container.append(this.$el);
		}
		this.input = this.$el.find('.ui-cascader-input');
		this.inputDom = this.input.find('input');
		this.arrow = this.input.find('.arrow');
		this.list = $(`	<div class="ui-cascader ui-cascader-dropdown panel hid"></div>`);
		this.searchedList = $(`<div class="ui-cascader ui-cascader-dropdown searchedlist hid"></div>`);

		$(document.body).append(this.list);
		$(document.body).append(this.searchedList);

		// input点击 弹出
		this.input.bind('click', () => {
			if (this.list.hasClass('hid')) {
				if (!this.initData) {
					this.createUl(this.data);
					this.initData = true;
				}
				this.popOpen();
			} else {
				// this.popClose();
			}
		});

		// input中输入内容时，搜索
		this.inputDom.bind('input', (e) => {
			const searchKey = e.target.value.trim();
			if (!this.initSearchData) {
				this.createSearchArr(this.data);
				this.initSearchData = true;
			}
			if (searchKey) {
				this.popClose();
				this.createSearchBox(searchKey);
			} else {
				this.popClose();
				if (this.list.hasClass('hid')) {
					if (!this.initData) {
						this.createUl(this.data);
						this.initData = true;
					}
					this.popOpen();
				}
			}
		});

		// input失去焦点时
		this.inputDom.bind('blur', (e) => {
			const val = e.target.value;
			// 如果input中的内容，和选中的结果不一致，则还原为选中的值
			if (val !== this.result.label) {
				this.inputDom.val(this.result.label);
			}
			// 收起查询
		});

		this.list.delegate('li.ui-cascader-menu-item', 'click', (e) => {
			var parent_index = $(e.target).parent().index();
			var value = $(e.target).attr('data-value');
			$(e.target).addClass('on').siblings().removeClass('on');
			this.level = parent_index;
			this.getArray(this.data, value);
		});

		this.searchedList.delegate('li.ui-cascader-menu-item', 'click', (e) => {
			let searStr = $(e.target).text().split('/');
			let litxt = this.list.find('.ui-cascader-menu').eq(0);
			let len = searStr.length;

			litxt.nextAll().remove();

			this.createSearchdlist(this.data, searStr[0]);

			for (var i = 1; i < len - 1; i++) {
				this.createSearchdlist(this.searActiveArr, searStr[i]);
			}
			this.list.find('.ui-cascader-menu').each((i, item) => {
				var jqElArr = $(item).find('li');

				this.highlighting(jqElArr, searStr[i]);
				if (i == len - 1) {
					this.getValue();
					this.popClose();
				}
			});
		});

		$('html').bind('click', this.htmlClickHandler.bind(this));

		this.setInitVal();

		return this.$el;
	}

	// 弹出
	popOpen(el) {
		// 修改箭头样式
		this.arrow.addClass('on');

		const windowHeight = $(window).height(); // 屏幕高度
		const comHeight = this.$el.height(); // 组件高度（input)
		const comTop = this.input.offset().top; // 组件（input）到顶部到距离（包括滚动条滚动到部分）
		const comLeft = this.input.offset().left;
		const scrollBarHeight = $(document).scrollTop(); // 滚动条到高度（即页面滚动进去到距离）
		let height = 0; // 弹出框到高度

		const zIndex = this.getMaxZIndex();

		if (el) {
			height = $(el).height(); // 弹出框的高度
			if (windowHeight - (comTop - scrollBarHeight + comHeight + height) < 10) {
				$(el).css('top', `${comTop - height - 5}px`);
				$(el).css('left', `${comLeft}px`);
			} else {
				$(el).css('top', `${comTop + comHeight}px`);
				$(el).css('left', `${comLeft}px`);
			}
			$(el).css('zIndex', zIndex + 1);
			el.removeClass('hid');
		} else {
			height = this.list.height(); // 弹出框的高度
			if (windowHeight - (comTop - scrollBarHeight + comHeight + height) < 10) {
				this.list.css('top', `-${comTop - height - 5}px`);
				this.list.css('left', `${comLeft}px`);
			} else {
				this.list.css('top', `${comTop + comHeight}px`);
				this.list.css('left', `${comLeft}px`);
			}
			this.list.css('zIndex', zIndex + 1);
			this.list.removeClass('hid');
		}
	}

	// 关闭
	popClose() {
		if (!this.list.hasClass('hid')) {
			this.list.addClass('hid');
		}

		if (!this.searchedList.hasClass('hid')) {
			this.searchedList.addClass('hid');
		}
		this.arrow.removeClass('on');
	}

	getArray(data, value) {
		for (var i in data) {
			if (data[i].value == value) {
				this.curArr = data[i].children;
				this.createEl();
				break;
			} else {
				this.getArray(data[i].children, value);
			}
		}
	}

	selJsonToStr(arr) {
		let labelArr = [];
		let valueArr = [];
		$.each(arr, function (i, data) {
			labelArr.push(data.label);
			valueArr.push(data.value);
		});
		return {
			label: labelArr.join(' / '),
			value: valueArr.join('.'),
		};
	}

	getValue(isClick = true) {
		let selJson = []; /* 最终选项数组 */
		this.list.find('li.on').each(function (i, data) {
			var label = $(this).attr('data-label'),
				value = $(this).attr('data-value');
			selJson.push({ value: value, label: label });
		});
		var { label, value } = this.selJsonToStr(selJson);

		this.inputDom.val(label);
		this.result = {
			label,
			value,
		};
		isClick && this.selectFn(selJson);
	}

	createUl(data) {
		if (!data) {
			return;
		}
		let arr = data;
		let liArr = [];

		let ul = $('<ul class="ui-cascader-menu"></ul>');
		$.each(arr, function (i, data) {
			liArr.push(`
        <li data-label="${
			data.label
		}" data-value="${data.value}" class="ui-cascader-menu-item  ${data.children ? '' : 'lastchild'}">${data.label}</li>
      `);
		});
		ul.append(liArr.join(''));
		this.list.append(ul);
	}

	createEl() {
		if (this.curArr) {
			/*  点击非最后一个子级 */
			this.list.find('.ui-cascader-menu').eq(this.level).nextAll().remove();
			this.createUl(this.curArr);
			this.popOpen();
		} else {
			/* 点击最后一个子级 */
			this.list.find('.ui-cascader-menu').eq(this.level).nextAll().remove();
			this.getValue();
			this.popClose();
		}
	}

	// 获取当前页面上所有z-index
	getMaxZIndex() {
		var maxZ = Math.max.apply(
			null,
			$.map($('body *'), function (e, n) {
				if ($(e).css('position') != 'static') return parseInt($(e).css('z-index')) || 0;
			})
		);
		return maxZ;
	}

	// 如果点击的不是组件范围，则关闭组件
	htmlClickHandler(e) {
		debugger;
		if (this.list.hasClass('hid') && this.searchedList.hasClass('hid')) return;

		var cascader = $(e.target).parents('.ui-cascader');
		if (cascader.size() == 0) {
			this.popClose();
		}
	}

	// 生成拉平的搜索结果
	createSearchArr(data, label) {
		for (var i in data) {
			if (!label) {
				label = '';
			}
			let str = label + '' + data[i].label + '/';
			if (data[i].children) {
				this.curArr = data[i].children;
				this.createSearchArr(this.curArr, str);
			} else {
				str = str.substring(0, str.lastIndexOf('/'));
				this.searchLabelArr.push(str.toLocaleLowerCase());
				this.searchValueArr.push(data[i].value);
			}
		}
	}

	// 生成搜索结果dom
	createSearchBox(label) {
		var liArr = [];
		let ul = $('<ul class="ui-cascader-menu"></ul>');
		$.each(this.searchLabelArr, (i, data) => {
			if (data.indexOf(label.toLocaleLowerCase()) != -1) {
				const value = this.searchValueArr[i];
				liArr.push(
					`<li data-value="${value}" class="ui-cascader-menu-item lastchild" title="${data}">${data}</li>`
				);
			}
		});

		if (liArr.length != 0) {
			this.searchedList.empty();

			ul.append(liArr.join(''));
			this.searchedList.append(ul);
			this.popOpen(this.searchedList);
		} else {
			this.searchedList.empty();
			ul.append('<li class="nosearch">无匹配数据</li>');
			this.searchedList.append(ul);
			this.popOpen(this.searchedList);
		}
	}

	createSearchdlist(data, label) {
		for (var i in data) {
			if (data[i].label.toLocaleLowerCase() == label.toLocaleLowerCase()) {
				this.searActiveArr = data[i].children;
			}
		}
		this.createUl(this.searActiveArr);
	}

	highlighting(jqElArr, highStr) {
		jqElArr.each((i, item) => {
			var curtxt = $(item).attr('data-label').toLocaleLowerCase();
			if (highStr.toLocaleLowerCase() == curtxt) {
				var selectedItem = $(item);
				$(item).addClass('on').siblings().removeClass('on');
				this.scrollToOpened(selectedItem);
			}
		});
	}

	scrollToOpened(selectedItem) {
		var listUl = selectedItem.parents('ul');
		if (selectedItem.size() > 0) {
			var scrollTop = listUl.scrollTop(),
				top = selectedItem.position().top + scrollTop;
			if (scrollTop < top) {
				top = top - (listUl.height() - selectedItem.height()) / 2;
				listUl.scrollTop(top);
			}
		}
	}

	getLabelByVal(val, data) {
		return data.find((currentLv) => currentLv.value === val);
	}

	// 如果传入初值，则设置初始状态
	setInitVal() {
		if (this.value) {
			let valArr = this.value.split('.');
			let ret = [];
			let searStr = [];
			for (i = 0; i < valArr.length; i++) {
				if (ret.length) {
					const temp = this.getLabelByVal(valArr[i], ret[ret.length - 1].children);
					ret.push(temp);
					searStr.push(temp.label);
				} else {
					const temp = this.getLabelByVal(valArr[i], this.data);
					ret.push(temp);
					searStr.push(temp.label);
				}
			}
			let litxt = this.list.find('.ui-cascader-menu').eq(0);
			let len = searStr.length;

			litxt.nextAll().remove();

			if (!this.initData) {
				this.createUl(this.data);
				this.initData = true;
			}

			this.createSearchdlist(this.data, searStr[0]);

			for (var i = 1; i < len - 1; i++) {
				this.createSearchdlist(this.searActiveArr, searStr[i]);
			}
			this.list.find('.ui-cascader-menu').each((i, item) => {
				var jqElArr = $(item).find('li');

				this.highlighting(jqElArr, searStr[i]);
				if (i == len - 1) {
					this.getValue(false);
					this.popClose();
				}
			});
		}
	}

	getResult() {
		return this.result;
	}
}
