import {
	LinkPreset,
	type NavBarConfig,
	type NavBarLink,
	type NavBarSearchConfig,
	NavBarSearchMethod,
} from "../types/config";
import { siteConfig } from "./siteConfig";

// 根据页面开关动态生成导航栏配置
const getDynamicNavBarConfig = (): NavBarConfig => {
	// 基础导航栏链接
	const links: (NavBarLink | LinkPreset)[] = [
		// 主页
		LinkPreset.Home,

		// 归档
		LinkPreset.Archive,

		// 项目分类
		{
			name: "项目",
			url: "/archive/?category=%E9%A1%B9%E7%9B%AE",
			icon: "material-symbols:rocket-launch",
			children: [
				{
					name: "藏文字符识别系统",
					url: "https://cairangxianmu-tibetan-hwr.hf.space",
					external: true,
				},
				{
					name: "四部医典知识库系统",
					url: "http://gyushi.cairangxianmu.com/",
					external: true,
				},
			],
		},
	];

	// 根据配置决定是否添加友链，在siteConfig关闭pages.friends时导航栏不显示友链
	if (siteConfig.pages.friends) {
		links.push(LinkPreset.Friends);
	}

	// 根据配置决定是否添加留言板，在siteConfig关闭pages.guestbook时导航栏不显示留言板
	if (siteConfig.pages.guestbook) {
		links.push(LinkPreset.Guestbook);
	}

	// 关于页面（直接跳转，无下拉菜单）
	links.push({
		name: "关于",
		url: "/about/",
		icon: "material-symbols:person",
	});


	// 仅返回链接，其它导航搜索相关配置在模块顶层常量中独立导出
	return { links } as NavBarConfig;
};

// 导航搜索配置
export const navBarSearchConfig: NavBarSearchConfig = {
	method: NavBarSearchMethod.PageFind,
};

export const navBarConfig: NavBarConfig = getDynamicNavBarConfig();
