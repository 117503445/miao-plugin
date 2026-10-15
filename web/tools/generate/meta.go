package main

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"unicode"
)

// meta 保存喵喵角色dir目录、data完整数据和id/name等基础字段。
type meta struct {
	dir              string
	data             map[string]json.RawMessage
	ID               int
	Name, Elem, Path string
	Star             int
	Base             map[string]float64
}

// setData 是name套装名称和idxs各部位资料。
type setData struct {
	Name string `json:"name"`
	Idxs map[string]struct {
		Name string `json:"name"`
	} `json:"idxs"`
}

// norm 将s中的英文与数字转小写，用于关联GOOD标识和英文显示名。
func norm(s string) string {
	return strings.Map(func(r rune) rune {
		if r <= 127 && (unicode.IsLetter(r) || unicode.IsDigit(r)) {
			return unicode.ToLower(r)
		}
		return -1
	}, s)
}

// decode 将data下key字段解析到dest，缺少字段时保留调用方零值。
func decode(data map[string]json.RawMessage, key string, dest any) {
	if raw, ok := data[key]; ok {
		must(json.Unmarshal(raw, dest))
	}
}

// loadLocale 从path建立英文名称到中文名称的映射。
func (g *generator) loadLocale(path string) {
	var loc map[string]map[string]string
	read(path, &loc)
	for key, en := range loc["en"] {
		if cn := loc["zh-cn"][key]; cn != "" {
			g.locale[norm(en)] = cn
		}
	}
	// 补充已由genshin-db原始资料核对、尚未进入Enka本地化表的新内容。
	var extra map[string]string
	read(filepath.Join(g.root, "web/data/name-overrides.json"), &extra)
	for key, name := range extra {
		g.locale[norm(key)] = name
	}
}

// loadMeta 枚举game游戏的角色基础资料，只读取data.json。
func (g *generator) loadMeta(game string) {
	g.meta[game] = map[int][]meta{}
	root := filepath.Join(g.root, "resources/meta-"+game+"/character")
	must(filepath.WalkDir(root, func(path string, e os.DirEntry, err error) error {
		// path是元数据路径，e与err为遍历结果；子元素目录由pick明确选择。
		if err != nil {
			return err
		}
		if e.IsDir() || e.Name() != "data.json" {
			return nil
		}
		var data map[string]json.RawMessage
		read(path, &data)
		var id int
		if err := json.Unmarshal(data["id"], &id); err != nil {
			var text string
			if json.Unmarshal(data["id"], &text) != nil {
				return nil
			}
			id, _ = strconv.Atoi(text)
		}
		if id == 0 {
			return nil
		}
		m := meta{dir: filepath.Dir(path), data: data, ID: id}
		decode(data, "name", &m.Name)
		decode(data, "elem", &m.Elem)
		decode(data, "weapon", &m.Path)
		decode(data, "star", &m.Star)
		decode(data, "baseAttr", &m.Base)
		g.meta[game][id] = append(g.meta[game][id], m)
		return nil
	}))
}

// pick 按game、id和version选取对应角色资料，排除错误命途/强化版。
func (g *generator) pick(game string, id, version int) meta {
	items := g.meta[game][id]
	for _, m := range items {
		if strings.Contains(m.Name, "Pro") != (version > 0) {
			continue
		}
		if filepath.Base(m.dir) == m.Name {
			return m
		}
	}
	if len(items) > 0 {
		return items[0]
	}
	panic(fmt.Sprintf("角色元数据缺失 %s/%d", game, id))
}

// media 复制path到静态素材目录，返回内容摘要命名的访问路径；缺图显示无图状态。
func (g *generator) media(path string) string {
	raw, err := os.ReadFile(path)
	if os.IsNotExist(err) {
		return ""
	}
	must(err)
	sum := sha256.Sum256(raw)
	name := hex.EncodeToString(sum[:8]) + filepath.Ext(path)
	dest := filepath.Join(g.out, "media", name)
	must(os.WriteFile(dest, raw, 0644))
	return "/media/" + name
}

// portrait 获取m角色的头像和背景；两游戏各自使用上游原有素材。
func (g *generator) portrait(m meta) (string, string) {
	return g.media(filepath.Join(m.dir, "imgs/face.webp")), g.media(filepath.Join(m.dir, "imgs/card.webp"))
}

// weaponMeta 通过game及name或id查找武器元数据，不猜测缺失的武器属性。
func (g *generator) weaponMeta(game, name string, id int) (map[string]json.RawMessage, string) {
	var result map[string]json.RawMessage
	found := ""
	root := filepath.Join(g.root, "resources/meta-"+game+"/weapon")
	must(filepath.WalkDir(root, func(path string, e os.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if e.IsDir() || e.Name() != "data.json" || found != "" {
			return nil
		}
		var data map[string]json.RawMessage
		read(path, &data)
		var n string
		var i int
		decode(data, "name", &n)
		if json.Unmarshal(data["id"], &i) != nil {
			var s string
			decode(data, "id", &s)
			i, _ = strconv.Atoi(s)
		}
		if (id != 0 && i == id) || (name != "" && n == name) {
			result = data
			found = filepath.Dir(path)
		}
		return nil
	}))
	return result, found
}
