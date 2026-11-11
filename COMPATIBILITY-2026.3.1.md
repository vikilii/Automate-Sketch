# Sketch 2026.3.1 兼容修复说明

验证日期：2026 年 11 月 11 日。目标应用为本机 `/Applications/Sketch.app` 中的 **Sketch 2026.3.1**。

这是基于 Automate Sketch 源码制作的分支兼容修复版，不是原作者发布的官方更新。插件版本为 `2026.3.1`，内部版本为 `2026030101`。保留原有 291 个命令标识；最低目标版本设置为 Sketch 2026.3.1，未验证旧版 Sketch 或未来版本。

## 安装

1. 从本仓库的 `v2026.3.1` Release 下载并解压 `Automate-Sketch-2026.3.1.zip`。
2. 双击其中的 `automate-sketch.sketchplugin`，在 Sketch 中安装。
3. 如果旧版已加载，重启 Sketch，再从插件菜单运行功能。

源码目录里的 `automate-sketch.sketchplugin` 也可以直接双击安装，无需 Sketch Runner。本次修复没有自动安装到用户插件目录。

三个中英文 manifest 已同步。原项目的自动更新地址已移除，避免旧发布版覆盖修复。原有 Google Analytics 上报代码已停用。

## 修复范围

| 范围 | 修复内容 |
| --- | --- |
| 公共兼容层 | 统一版本解析、Frame/Graphic/Group 分类、子图层遍历、坐标与边界、分组、动作调用、导出和组件库访问，适配新版原生接口。 |
| 画板与图层 | 使用新版 Frame 容器；修复 Frame 与 Group 转换、从选择创建容器、内容尺寸适配、分组清理、选择与排序。空 Frame 不会被当作空组删除。 |
| 几何与布局 | 重设边界框时保留旋转和翻转后的形状外观，处理曲线控制点；修复相对尺寸、约束恢复、参考线坐标与重复参考线。 |
| 文本 | 修复文本属性访问、行高字距、水平缩放、书写方向、截断、固定宽度文本的高度适配以及转轮廓。 |
| 组件与组件库 | 修复组件创建、插入实例、覆盖项重设与可编辑性、导入与更新、替换引用、解除库关联、链接图层创建与同步。主题切换实际替换匹配的组件、样式、颜色及相关覆盖项。 |
| 剪贴板与样式 | 更新 Sketch 图层归档读取接口，导入跨文档组件和样式依赖；修复粘贴替换、填充及边框等样式粘贴、禁用样式清理。 |
| 导出与位图 | 更新 PNG、SVG、HTML、ICNS、组件预览与切片导出；支持小数倍率；图片导出生成实际 PNG；九宫格按两个方向的独立比例裁切并保留位置和变换。 |
| 工具与设置 | 迁移屏幕取色、Terminal 打开、云文档另存、库更新入口；修复语言回退、原子写入 manifest、快捷键管理、农历日期和干支年份。 |
| 工程完整性 | 修复脚本语法错误、大小写不一致的本地引用与菜单脚本路径。新增静态检查、Sketch 内运行回归和可重复打包脚本。 |

主要实现集中于 `automate-sketch.sketchplugin/Contents/Sketch/modules/Compatibility.js`，并迁移使用这些接口的命令脚本。依据包括安装版本随附的 `SketchAPI_dom.js`、Sketch 官方插件 API 和真实应用内运行结果。

## 两项菜单行为调整

新版容器模型下，以下旧开关改为可用的容器操作，原命令标识保留，菜单已对应改名。

* **Toggle Relative Content Sizing / 切换内容相对尺寸（再次运行恢复）**：为 Frame 子内容启用相对尺寸，再次执行恢复此前保存的尺寸与固定边约束。
* **Toggle Group / Graphic Container / 切换群组 / Graphic 容器**：在普通群组和新版 Graphic 容器之间切换。

## 验证结果

在 Sketch 2026.3.1 中串行运行 **26 组、376 个用例，覆盖 278 个不同命令，0 失败**。其中包含 22 个检查实际结果的语义测试；其余主要检查命令在固定素材和默认对话框选项下执行是否报错。命令覆盖不等于每个选项组合均已验证。

静态检查解析了 **215 个 JavaScript 文件**，核对本地引用大小写、处理函数、三份 manifest 的 291 个命令标识及菜单引用。

导出产物另外检查 PNG 签名及非零尺寸、150×75 的小数倍率导出、SVG XML、ICNS 头与文件长度、HTML 图片依赖，以及重设边界框前后图像逐像素一致。结果记录在 `tests/artifact-verification.json`。

完整执行结果与未执行命令列表位于 `tests/verification-results.json`。测试使用临时文档和本地测试组件库，模拟对话框响应；测试结束恢复原文档选择与剪贴板，不使用用户组件库作为测试素材。

在 macOS 上安装 Sketch 2026.3.1 后，可在仓库根目录运行：

```sh
node tests/static-check.cjs
python3 tests/run-suite.py
python3 tests/verify-artifacts.py
python3 scripts/package.py
```

产物检查需要 Python Pillow。`tests/.artifacts/` 存放测试生成文件，`dist/` 存放安装 ZIP；两者均已加入忽略规则。

## 验证边界

以下 13 个命令没有自动运行完整入口，原因是需要真实系统交互、会改变应用设置或打开外部页面：

```text
change_language
change_log
check_for_library_updates
donate
open_terminal_at_file_folder
pick_color_and_copy
plugin_dev_setting
reload_plugins
report_issue
shortcuts_manager
svg_export_setting
switch_language
web_site
```

语言 manifest 生成、原子替换与重复执行另有语义测试。屏幕取色、快捷键设置界面、插件重载、真实远程组件库更新仍需用户在实际环境中操作确认。

云文档另存只验证了非云文档的保护分支，尚未在已登录的云文档上测试。组件库验证使用本地构造的测试库，不能替代所有远程库、复杂嵌套覆盖项和生产文档的验证。

SVG 默认导出已在 Sketch 中验证。可选的 SVGO 优化需要单独安装 SVGO；代码为不同主版本及配置格式提供适配，本机未安装 SVGO，外部优化分支没有实测。自定义 SVGO 配置还需符合所安装版本的插件名称和参数要求。

这些边界表示尚未验证的环境和交互，不应将本次结果理解为全部 291 个命令、所有对话框分支和任意文档均已通过测试。
